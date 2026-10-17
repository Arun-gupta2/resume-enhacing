create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text check (full_name is null or char_length(full_name) <= 80),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.resumes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 120),
  status text not null default 'draft' check (status in ('draft', 'ready', 'archived')),
  current_version_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint resumes_id_user_id_key unique (id, user_id)
);

create table public.resume_versions (
  id uuid primary key default gen_random_uuid(),
  resume_id uuid not null,
  user_id uuid not null,
  version_number integer not null check (version_number > 0),
  content jsonb not null default '{}'::jsonb check (jsonb_typeof(content) = 'object'),
  created_at timestamptz not null default now(),
  constraint resume_versions_owner_fkey
    foreign key (resume_id, user_id) references public.resumes (id, user_id) on delete cascade,
  constraint resume_versions_resume_number_key unique (resume_id, version_number),
  constraint resume_versions_id_resume_key unique (id, resume_id)
);

alter table public.resumes
  add constraint resumes_current_version_fkey
  foreign key (current_version_id, id)
  references public.resume_versions (id, resume_id)
  on delete set null (current_version_id);

create table public.job_descriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  resume_id uuid not null,
  title text not null check (char_length(btrim(title)) between 1 and 160),
  company text check (company is null or char_length(company) <= 160),
  description text not null check (char_length(btrim(description)) between 20 and 30000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint job_descriptions_resume_owner_fkey
    foreign key (resume_id, user_id) references public.resumes (id, user_id) on delete cascade,
  constraint job_descriptions_id_user_id_key unique (id, user_id)
);

create table public.analysis_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  resume_id uuid not null,
  job_description_id uuid not null,
  score smallint check (score is null or score between 0 and 100),
  matched_terms jsonb not null default '[]'::jsonb check (jsonb_typeof(matched_terms) = 'array'),
  missing_terms jsonb not null default '[]'::jsonb check (jsonb_typeof(missing_terms) = 'array'),
  explanation jsonb not null default '{}'::jsonb check (jsonb_typeof(explanation) = 'object'),
  created_at timestamptz not null default now(),
  constraint analysis_results_resume_owner_fkey
    foreign key (resume_id, user_id) references public.resumes (id, user_id) on delete cascade,
  constraint analysis_results_job_owner_fkey
    foreign key (job_description_id, user_id) references public.job_descriptions (id, user_id) on delete cascade
);

create index resumes_user_updated_idx on public.resumes (user_id, updated_at desc);
create index resume_versions_owner_resume_idx on public.resume_versions (user_id, resume_id, version_number desc);
create index job_descriptions_user_resume_created_idx on public.job_descriptions (user_id, resume_id, created_at desc);
create index analysis_results_user_created_idx on public.analysis_results (user_id, created_at desc);

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger resumes_set_updated_at
before update on public.resumes
for each row execute function public.set_updated_at();

create trigger job_descriptions_set_updated_at
before update on public.job_descriptions
for each row execute function public.set_updated_at();

create function public.create_profile_for_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (
    new.id,
    nullif(left(btrim(new.raw_user_meta_data ->> 'full_name'), 80), '')
  );
  return new;
end;
$$;

create trigger auth_user_profile_created
after insert on auth.users
for each row execute function public.create_profile_for_auth_user();

alter table public.profiles enable row level security;
alter table public.resumes enable row level security;
alter table public.resume_versions enable row level security;
alter table public.job_descriptions enable row level security;
alter table public.analysis_results enable row level security;

create policy "profiles_select_own" on public.profiles
for select to authenticated using (id = (select auth.uid()));
create policy "profiles_insert_own" on public.profiles
for insert to authenticated with check (id = (select auth.uid()));
create policy "profiles_update_own" on public.profiles
for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));
create policy "profiles_delete_own" on public.profiles
for delete to authenticated using (id = (select auth.uid()));

create policy "resumes_select_own" on public.resumes
for select to authenticated using (user_id = (select auth.uid()));
create policy "resumes_insert_own" on public.resumes
for insert to authenticated with check (user_id = (select auth.uid()));
create policy "resumes_update_own" on public.resumes
for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "resumes_delete_own" on public.resumes
for delete to authenticated using (user_id = (select auth.uid()));

create policy "resume_versions_select_own" on public.resume_versions
for select to authenticated using (user_id = (select auth.uid()));
create policy "resume_versions_insert_own" on public.resume_versions
for insert to authenticated with check (user_id = (select auth.uid()));
create policy "resume_versions_update_own" on public.resume_versions
for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "resume_versions_delete_own" on public.resume_versions
for delete to authenticated using (user_id = (select auth.uid()));

create policy "job_descriptions_select_own" on public.job_descriptions
for select to authenticated using (user_id = (select auth.uid()));
create policy "job_descriptions_insert_own" on public.job_descriptions
for insert to authenticated with check (user_id = (select auth.uid()));
create policy "job_descriptions_update_own" on public.job_descriptions
for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "job_descriptions_delete_own" on public.job_descriptions
for delete to authenticated using (user_id = (select auth.uid()));

create policy "analysis_results_select_own" on public.analysis_results
for select to authenticated using (user_id = (select auth.uid()));
create policy "analysis_results_insert_own" on public.analysis_results
for insert to authenticated with check (user_id = (select auth.uid()));
create policy "analysis_results_update_own" on public.analysis_results
for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "analysis_results_delete_own" on public.analysis_results
for delete to authenticated using (user_id = (select auth.uid()));

grant usage on schema public to authenticated;
grant select, insert, update, delete on
  public.profiles,
  public.resumes,
  public.resume_versions,
  public.job_descriptions,
  public.analysis_results
to authenticated;

create function public.create_resume(p_title text)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  owner_id uuid := auth.uid();
  new_resume_id uuid;
  new_version_id uuid;
begin
  if owner_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if p_title is null or char_length(btrim(p_title)) not between 1 and 120 then
    raise exception 'Resume title must be between 1 and 120 characters' using errcode = '22023';
  end if;

  insert into public.resumes (user_id, title)
  values (owner_id, btrim(p_title))
  returning id into new_resume_id;

  insert into public.resume_versions (resume_id, user_id, version_number, content)
  values (new_resume_id, owner_id, 1, '{}'::jsonb)
  returning id into new_version_id;

  update public.resumes set current_version_id = new_version_id where id = new_resume_id;
  return new_resume_id;
end;
$$;

create function public.duplicate_resume(p_resume_id uuid, p_title text)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  owner_id uuid := auth.uid();
  source_version jsonb;
  new_resume_id uuid;
  new_version_id uuid;
begin
  if owner_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if p_title is null or char_length(btrim(p_title)) not between 1 and 120 then
    raise exception 'Resume title must be between 1 and 120 characters' using errcode = '22023';
  end if;

  select versions.content into source_version
  from public.resumes as resumes
  join public.resume_versions as versions
    on versions.resume_id = resumes.id and versions.user_id = resumes.user_id
  where resumes.id = p_resume_id and resumes.user_id = owner_id
  order by versions.version_number desc
  limit 1;

  if not found then
    raise exception 'Resume not found' using errcode = 'P0002';
  end if;

  insert into public.resumes (user_id, title)
  values (owner_id, btrim(p_title))
  returning id into new_resume_id;

  insert into public.resume_versions (resume_id, user_id, version_number, content)
  values (new_resume_id, owner_id, 1, source_version)
  returning id into new_version_id;

  update public.resumes set current_version_id = new_version_id where id = new_resume_id;
  return new_resume_id;
end;
$$;

create function public.save_resume_version(p_resume_id uuid, p_content jsonb)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  owner_id uuid := auth.uid();
  next_version integer;
  new_version_id uuid;
begin
  if owner_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if p_content is null or jsonb_typeof(p_content) <> 'object' or octet_length(p_content::text) > 200000 then
    raise exception 'Resume content must be a JSON object under 200 KB' using errcode = '22023';
  end if;

  perform 1 from public.resumes
  where id = p_resume_id and user_id = owner_id
  for update;

  if not found then
    raise exception 'Resume not found' using errcode = 'P0002';
  end if;

  select coalesce(max(version_number), 0) + 1 into next_version
  from public.resume_versions
  where resume_id = p_resume_id and user_id = owner_id;

  insert into public.resume_versions (resume_id, user_id, version_number, content)
  values (p_resume_id, owner_id, next_version, p_content)
  returning id into new_version_id;

  update public.resumes
  set current_version_id = new_version_id
  where id = p_resume_id and user_id = owner_id;

  return new_version_id;
end;
$$;

revoke all on function public.create_resume(text) from public, anon;
revoke all on function public.duplicate_resume(uuid, text) from public, anon;
revoke all on function public.save_resume_version(uuid, jsonb) from public, anon;
grant execute on function public.create_resume(text) to authenticated;
grant execute on function public.duplicate_resume(uuid, text) to authenticated;
grant execute on function public.save_resume_version(uuid, jsonb) to authenticated;