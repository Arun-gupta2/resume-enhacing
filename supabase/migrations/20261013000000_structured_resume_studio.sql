alter table public.resumes
  add column template text not null default 'editorial'
    check (template in ('editorial', 'modern', 'compact')),
  add column client_revision bigint not null default 0 check (client_revision >= 0);

alter table public.resume_versions
  add column variant_id uuid,
  add column client_revision bigint not null default 0 check (client_revision >= 0);

with numbered_versions as (
  select id, row_number() over (partition by resume_id order by version_number) as revision
  from public.resume_versions
)
update public.resume_versions as versions
set client_revision = numbered_versions.revision
from numbered_versions
where versions.id = numbered_versions.id;

update public.resumes as resumes
set client_revision = coalesce((
  select max(versions.client_revision)
  from public.resume_versions as versions
  where versions.resume_id = resumes.id and versions.variant_id is null
), 0);

create table public.resume_variants (
  id uuid primary key default gen_random_uuid(),
  resume_id uuid not null,
  user_id uuid not null,
  job_description_id uuid,
  name text not null check (char_length(btrim(name)) between 1 and 120),
  template text not null check (template in ('editorial', 'modern', 'compact')),
  client_revision bigint not null default 0 check (client_revision >= 0),
  current_version_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint resume_variants_resume_owner_fkey
    foreign key (resume_id, user_id) references public.resumes (id, user_id) on delete cascade,
  constraint resume_variants_job_owner_fkey
    foreign key (job_description_id, user_id) references public.job_descriptions (id, user_id) on delete set null (job_description_id),
  constraint resume_variants_id_owner_resume_key unique (id, user_id, resume_id)
);

alter table public.resume_versions
  add constraint resume_versions_variant_owner_fkey
    foreign key (variant_id, user_id, resume_id)
    references public.resume_variants (id, user_id, resume_id) on delete cascade,
  add constraint resume_versions_id_resume_variant_key unique (id, resume_id, variant_id);

alter table public.resume_variants
  add constraint resume_variants_current_version_fkey
  foreign key (current_version_id, resume_id, id)
  references public.resume_versions (id, resume_id, variant_id)
  on delete set null (current_version_id);

create unique index resume_versions_base_revision_key
  on public.resume_versions (resume_id, client_revision) where variant_id is null;
create unique index resume_versions_variant_revision_key
  on public.resume_versions (variant_id, client_revision) where variant_id is not null;
create index resume_variants_owner_resume_updated_idx
  on public.resume_variants (user_id, resume_id, updated_at desc);

create trigger resume_variants_set_updated_at
before update on public.resume_variants
for each row execute function public.set_updated_at();

alter table public.resume_variants enable row level security;
create policy "resume_variants_select_own" on public.resume_variants
for select to authenticated using (user_id = (select auth.uid()));
create policy "resume_variants_insert_own" on public.resume_variants
for insert to authenticated with check (user_id = (select auth.uid()));
create policy "resume_variants_update_own" on public.resume_variants
for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "resume_variants_delete_own" on public.resume_variants
for delete to authenticated using (user_id = (select auth.uid()));

grant select, insert, update, delete on public.resume_variants to authenticated;
revoke all on function public.save_resume_version(uuid, jsonb) from public, anon, authenticated;

create function public.create_resume_variant(
  p_resume_id uuid,
  p_job_description_id uuid,
  p_name text
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  owner_id uuid := auth.uid();
  source_content jsonb;
  source_template text;
  next_version integer;
  new_variant_id uuid;
  new_version_id uuid;
begin
  if owner_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if p_name is null or char_length(btrim(p_name)) not between 1 and 120 then
    raise exception 'Variant name must be between 1 and 120 characters' using errcode = '22023';
  end if;

  select resumes.template into source_template
  from public.resumes as resumes
  where resumes.id = p_resume_id and resumes.user_id = owner_id
  for update;
  if not found then
    raise exception 'Resume not found' using errcode = 'P0002';
  end if;

  if not exists (
    select 1 from public.job_descriptions as jobs
    where jobs.id = p_job_description_id
      and jobs.resume_id = p_resume_id
      and jobs.user_id = owner_id
  ) then
    raise exception 'Job description not found' using errcode = 'P0002';
  end if;

  select versions.content into source_content
  from public.resume_versions as versions
  where versions.resume_id = p_resume_id
    and versions.user_id = owner_id
    and versions.variant_id is null
  order by versions.version_number desc
  limit 1;

  select coalesce(max(versions.version_number), 0) + 1 into next_version
  from public.resume_versions as versions
  where versions.resume_id = p_resume_id;

  insert into public.resume_variants (resume_id, user_id, job_description_id, name, template)
  values (p_resume_id, owner_id, p_job_description_id, btrim(p_name), source_template)
  returning id into new_variant_id;

  insert into public.resume_versions (resume_id, user_id, variant_id, version_number, client_revision, content)
  values (p_resume_id, owner_id, new_variant_id, next_version, 0, coalesce(source_content, '{}'::jsonb))
  returning id into new_version_id;

  update public.resume_variants
  set current_version_id = new_version_id
  where id = new_variant_id and user_id = owner_id;

  return new_variant_id;
end;
$$;

create function public.save_structured_resume_version(
  p_resume_id uuid,
  p_variant_id uuid,
  p_client_revision bigint,
  p_content jsonb,
  p_template text
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  owner_id uuid := auth.uid();
  saved_revision bigint;
  saved_version_id uuid;
  saved_template text;
  next_version integer;
  new_version_id uuid;
begin
  if owner_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if p_client_revision <= 0 then
    raise exception 'Client revision must be positive' using errcode = '22023';
  end if;
  if p_client_revision is null then
    raise exception 'Client revision is required' using errcode = '22023';
  end if;
  if p_content is null or jsonb_typeof(p_content) <> 'object' or octet_length(p_content::text) > 200000 then
    raise exception 'Resume content must be a JSON object under 200 KB' using errcode = '22023';
  end if;
  if p_template is null or p_template not in ('editorial', 'modern', 'compact') then
    raise exception 'Unknown resume template' using errcode = '22023';
  end if;

  perform 1 from public.resumes
  where id = p_resume_id and user_id = owner_id
  for update;
  if not found then
    raise exception 'Resume not found' using errcode = 'P0002';
  end if;

  if p_variant_id is null then
    select resumes.client_revision, resumes.current_version_id, resumes.template
    into saved_revision, saved_version_id, saved_template
    from public.resumes as resumes
    where resumes.id = p_resume_id and resumes.user_id = owner_id
    for update;
    if not found then
      raise exception 'Resume not found' using errcode = 'P0002';
    end if;
  else
    select variants.client_revision, variants.current_version_id, variants.template
    into saved_revision, saved_version_id, saved_template
    from public.resume_variants as variants
    where variants.id = p_variant_id
      and variants.resume_id = p_resume_id
      and variants.user_id = owner_id
    for update;
    if not found then
      raise exception 'Resume variant not found' using errcode = 'P0002';
    end if;
  end if;

  if p_client_revision <= saved_revision then
    if p_client_revision = saved_revision
      and saved_version_id is not null
      and p_template = saved_template
      and exists (
        select 1 from public.resume_versions as versions
        where versions.id = saved_version_id
          and versions.content = p_content
      ) then
      return saved_version_id;
    end if;
    raise exception 'Stale resume revision; reload the latest version before saving' using errcode = '40001';
  end if;

  select coalesce(max(versions.version_number), 0) + 1 into next_version
  from public.resume_versions as versions
  where versions.resume_id = p_resume_id;

  insert into public.resume_versions (resume_id, user_id, variant_id, version_number, client_revision, content)
  values (p_resume_id, owner_id, p_variant_id, next_version, p_client_revision, p_content)
  returning id into new_version_id;

  if p_variant_id is null then
    update public.resumes
    set current_version_id = new_version_id,
        client_revision = p_client_revision,
        template = p_template
    where id = p_resume_id and user_id = owner_id;
  else
    update public.resume_variants
    set current_version_id = new_version_id,
        client_revision = p_client_revision,
        template = p_template
    where id = p_variant_id and resume_id = p_resume_id and user_id = owner_id;
  end if;

  return new_version_id;
end;
$$;

revoke all on function public.create_resume_variant(uuid, uuid, text) from public, anon;
revoke all on function public.save_structured_resume_version(uuid, uuid, bigint, jsonb, text) from public, anon;
grant execute on function public.create_resume_variant(uuid, uuid, text) to authenticated;
grant execute on function public.save_structured_resume_version(uuid, uuid, bigint, jsonb, text) to authenticated;