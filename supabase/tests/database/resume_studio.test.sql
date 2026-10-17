begin;

create extension if not exists pgtap with schema extensions;
select plan(10);

insert into auth.users (
  id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('11000000-0000-4000-8000-000000000011', 'authenticated', 'authenticated', 'studio-a@proofline.test', '', now(), '{}', '{}', now(), now()),
  ('22000000-0000-4000-8000-000000000022', 'authenticated', 'authenticated', 'studio-b@proofline.test', '', now(), '{}', '{}', now(), now());

insert into public.resumes (id, user_id, title) values
  ('33000000-0000-4000-8000-000000000033', '11000000-0000-4000-8000-000000000011', 'Original'),
  ('44000000-0000-4000-8000-000000000044', '22000000-0000-4000-8000-000000000022', 'Other original');

insert into public.resume_versions (id, resume_id, user_id, version_number, client_revision, content) values
  ('55000000-0000-4000-8000-000000000055', '33000000-0000-4000-8000-000000000033', '11000000-0000-4000-8000-000000000011', 1, 0, '{"summary":"source"}'),
  ('66000000-0000-4000-8000-000000000066', '44000000-0000-4000-8000-000000000044', '22000000-0000-4000-8000-000000000022', 1, 0, '{"summary":"other"}');

update public.resumes set current_version_id = '55000000-0000-4000-8000-000000000055'
where id = '33000000-0000-4000-8000-000000000033';
update public.resumes set current_version_id = '66000000-0000-4000-8000-000000000066'
where id = '44000000-0000-4000-8000-000000000044';

insert into public.job_descriptions (id, user_id, resume_id, title, description) values
  ('77000000-0000-4000-8000-000000000077', '11000000-0000-4000-8000-000000000011', '33000000-0000-4000-8000-000000000033', 'Role A', 'A sufficiently long role description for testing.'),
  ('88000000-0000-4000-8000-000000000088', '22000000-0000-4000-8000-000000000022', '44000000-0000-4000-8000-000000000044', 'Role B', 'Another sufficiently long role description.');

insert into public.resume_variants (id, resume_id, user_id, job_description_id, name, template) values
  ('99000000-0000-4000-8000-000000000099', '44000000-0000-4000-8000-000000000044', '22000000-0000-4000-8000-000000000022', '88000000-0000-4000-8000-000000000088', 'Other tailored', 'editorial');
insert into public.resume_versions (id, resume_id, user_id, version_number, variant_id, client_revision, content) values
  ('aa000000-0000-4000-8000-0000000000aa', '44000000-0000-4000-8000-000000000044', '22000000-0000-4000-8000-000000000022', 2, '99000000-0000-4000-8000-000000000099', 0, '{"summary":"other variant"}');
update public.resume_variants set current_version_id = 'aa000000-0000-4000-8000-0000000000aa'
where id = '99000000-0000-4000-8000-000000000099';

set local role authenticated;
select set_config('request.jwt.claim.sub', '11000000-0000-4000-8000-000000000011', true);
select set_config('request.jwt.claims', '{"sub":"11000000-0000-4000-8000-000000000011","role":"authenticated"}', true);

select is((select count(*) from public.resume_variants), 0::bigint, 'users cannot see another account variants');
select throws_ok(
  $$insert into public.resume_variants (resume_id, user_id, job_description_id, name, template) values ('44000000-0000-4000-8000-000000000044', '22000000-0000-4000-8000-000000000022', '88000000-0000-4000-8000-000000000088', 'forged', 'editorial')$$,
  '42501', null, 'users cannot create variants for another account'
);
select lives_ok(
  $$select public.create_resume_variant('33000000-0000-4000-8000-000000000033', '77000000-0000-4000-8000-000000000077', 'Role A copy')$$,
  'owner can create a job-specific variant'
);
select is((select count(*) from public.resume_variants), 1::bigint, 'owner sees only their created variant');
select throws_ok(
  $$select public.create_resume_variant('33000000-0000-4000-8000-000000000033', '88000000-0000-4000-8000-000000000088', 'Wrong role')$$,
  'P0002', null, 'variant creation rejects another users job description'
);
select lives_ok(
  $$select public.save_structured_resume_version('33000000-0000-4000-8000-000000000033', null, 1, '{"summary":"revised source"}'::jsonb, 'modern')$$,
  'owner can save a newer structured source revision'
);
select throws_ok(
  $$select public.save_structured_resume_version('33000000-0000-4000-8000-000000000033', null, 1, '{"summary":"stale content"}'::jsonb, 'modern')$$,
  '40001', null, 'stale save cannot replace a newer revision'
);
select lives_ok(
  $$select public.save_structured_resume_version('33000000-0000-4000-8000-000000000033', null, 1, '{"summary":"revised source"}'::jsonb, 'modern')$$,
  'retry of the exact latest revision is idempotent'
);
select is(
  (select versions.content ->> 'summary' from public.resume_versions as versions where versions.id = (select current_version_id from public.resumes where id = '33000000-0000-4000-8000-000000000033')),
  'revised source'::text,
  'latest source content remains intact after stale retry'
);
select is(
  (select template from public.resumes where id = '33000000-0000-4000-8000-000000000033'),
  'modern'::text,
  'template selection is persisted independently from resume content'
);

select * from finish();
rollback;