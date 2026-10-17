alter table public.resumes
  add column original_file_path text,
  add column original_file_name text check (original_file_name is null or char_length(original_file_name) <= 180),
  add column original_media_type text check (original_media_type is null or original_media_type in ('application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')),
  add column original_file_size bigint check (original_file_size is null or original_file_size between 1 and 10485760),
  add constraint resumes_file_metadata_complete_check check (
    (original_file_path is null and original_file_name is null and original_media_type is null and original_file_size is null)
    or
    (original_file_path is not null and original_file_name is not null and original_media_type is not null and original_file_size is not null)
  );

alter table public.analysis_results
  add column resume_version_id uuid,
  add column resume_variant_id uuid,
  add column ats_report jsonb not null default '{}'::jsonb check (jsonb_typeof(ats_report) = 'object'),
  add column optimization_proposals jsonb not null default '{"proposals": [], "caveats": []}'::jsonb check (jsonb_typeof(optimization_proposals) = 'object');

update public.analysis_results as analyses
set resume_version_id = coalesce(
  resumes.current_version_id,
  (
    select versions.id
    from public.resume_versions as versions
    where versions.resume_id = analyses.resume_id
      and versions.user_id = analyses.user_id
    order by versions.version_number desc
    limit 1
  )
)
from public.resumes as resumes
where resumes.id = analyses.resume_id and resumes.user_id = analyses.user_id;

update public.analysis_results as analyses
set resume_variant_id = versions.variant_id
from public.resume_versions as versions
where versions.id = analyses.resume_version_id
  and versions.resume_id = analyses.resume_id;

do $$
begin
  if exists (select 1 from public.analysis_results where resume_version_id is null) then
    raise exception 'Existing analysis results must be linked to a resume version before applying this migration';
  end if;
end;
$$;

alter table public.analysis_results
  alter column resume_version_id set not null,
  add constraint analysis_results_resume_version_fkey
    foreign key (resume_version_id, resume_id)
    references public.resume_versions (id, resume_id) on delete cascade,
  add constraint analysis_results_resume_variant_fkey
    foreign key (resume_variant_id, user_id, resume_id)
    references public.resume_variants (id, user_id, resume_id) on delete cascade,
  add constraint analysis_results_version_variant_fkey
    foreign key (resume_version_id, resume_id, resume_variant_id)
    references public.resume_versions (id, resume_id, variant_id) on delete cascade;

create index analysis_results_version_created_idx
  on public.analysis_results (user_id, resume_version_id, created_at desc);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'resume-files',
  'resume-files',
  false,
  10485760,
  array['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']::text[]
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create policy "resume_files_select_own" on storage.objects
for select to authenticated
using (bucket_id = 'resume-files' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "resume_files_insert_own" on storage.objects
for insert to authenticated
with check (bucket_id = 'resume-files' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "resume_files_update_own" on storage.objects
for update to authenticated
using (bucket_id = 'resume-files' and (storage.foldername(name))[1] = (select auth.uid())::text)
with check (bucket_id = 'resume-files' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "resume_files_delete_own" on storage.objects
for delete to authenticated
using (bucket_id = 'resume-files' and (storage.foldername(name))[1] = (select auth.uid())::text);