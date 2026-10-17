begin;

create extension if not exists pgtap with schema extensions;
select plan(21);

insert into auth.users (
  id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('10000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'rls-a@proofline.test', '', now(), '{}', '{"full_name":"RLS A"}', now(), now()),
  ('20000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'rls-b@proofline.test', '', now(), '{}', '{"full_name":"RLS B"}', now(), now());

insert into public.resumes (id, user_id, title) values
  ('30000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000001', 'A resume'),
  ('40000000-0000-4000-8000-000000000004', '20000000-0000-4000-8000-000000000002', 'B resume');

insert into public.resume_versions (id, resume_id, user_id, version_number, content) values
  ('50000000-0000-4000-8000-000000000005', '30000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000001', 1, '{"text":"A"}'),
  ('60000000-0000-4000-8000-000000000006', '40000000-0000-4000-8000-000000000004', '20000000-0000-4000-8000-000000000002', 1, '{"text":"B"}');

update public.resumes set current_version_id = '50000000-0000-4000-8000-000000000005'
where id = '30000000-0000-4000-8000-000000000003';
update public.resumes set current_version_id = '60000000-0000-4000-8000-000000000006'
where id = '40000000-0000-4000-8000-000000000004';

insert into public.job_descriptions (id, user_id, resume_id, title, description) values
  ('70000000-0000-4000-8000-000000000007', '10000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000003', 'A role', 'A sufficiently long description for the test.'),
  ('80000000-0000-4000-8000-000000000008', '20000000-0000-4000-8000-000000000002', '40000000-0000-4000-8000-000000000004', 'B role', 'Another sufficiently long description for the test.');

insert into public.analysis_results (id, user_id, resume_id, job_description_id, score) values
  ('90000000-0000-4000-8000-000000000009', '10000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000003', '70000000-0000-4000-8000-000000000007', 82),
  ('a0000000-0000-4000-8000-00000000000a', '20000000-0000-4000-8000-000000000002', '40000000-0000-4000-8000-000000000004', '80000000-0000-4000-8000-000000000008', 74);

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claims', '{"sub":"10000000-0000-4000-8000-000000000001","role":"authenticated"}', true);

select is((select count(*) from public.profiles), 1::bigint, 'profile query returns only the signed-in user');
select is((select count(*) from public.resumes), 1::bigint, 'resume query returns only the signed-in user');
select is((select count(*) from public.resume_versions), 1::bigint, 'version query returns only the signed-in user');
select is((select count(*) from public.job_descriptions), 1::bigint, 'job query returns only the signed-in user');
select is((select count(*) from public.analysis_results), 1::bigint, 'analysis query returns only the signed-in user');

select throws_ok(
  $$insert into public.profiles (id, full_name) values ('20000000-0000-4000-8000-000000000002', 'forged')$$,
  '42501', null, 'cannot insert another user profile'
);
select throws_ok(
  $$insert into public.resumes (user_id, title) values ('20000000-0000-4000-8000-000000000002', 'forged')$$,
  '42501', null, 'cannot create a resume for another user'
);
select throws_ok(
  $$insert into public.resume_versions (resume_id, user_id, version_number) values ('40000000-0000-4000-8000-000000000004', '20000000-0000-4000-8000-000000000002', 2)$$,
  '42501', null, 'cannot create a version for another user'
);
select throws_ok(
  $$insert into public.job_descriptions (user_id, resume_id, title, description) values ('20000000-0000-4000-8000-000000000002', '40000000-0000-4000-8000-000000000004', 'forged', 'A sufficiently long description for the test.')$$,
  '42501', null, 'cannot create a job description for another user'
);
select throws_ok(
  $$insert into public.analysis_results (user_id, resume_id, job_description_id) values ('20000000-0000-4000-8000-000000000002', '40000000-0000-4000-8000-000000000004', '80000000-0000-4000-8000-000000000008')$$,
  '42501', null, 'cannot create an analysis for another user'
);
select throws_ok(
  $$insert into public.resume_versions (resume_id, user_id, version_number) values ('40000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000001', 2)$$,
  '23503', null, 'cannot attach a version to another user resume'
);
select throws_ok(
  $$insert into public.job_descriptions (user_id, resume_id, title, description) values ('10000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000004', 'forged relation', 'A sufficiently long description for the test.')$$,
  '23503', null, 'cannot attach a job description to another user resume'
);
select throws_ok(
  $$insert into public.analysis_results (user_id, resume_id, job_description_id) values ('10000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000003', '80000000-0000-4000-8000-000000000008')$$,
  '23503', null, 'cannot attach an analysis to another user job description'
);

select lives_ok(
  $$insert into public.resumes (user_id, title) values ('10000000-0000-4000-8000-000000000001', 'A new resume')$$,
  'can create a resume for the signed-in user'
);
select lives_ok(
  $$select public.create_resume('Created atomically')$$,
  'resume RPC creates only for the signed-in user'
);
select throws_ok(
  $$select public.duplicate_resume('40000000-0000-4000-8000-000000000004', 'forged duplicate')$$,
  'P0002', null, 'cannot duplicate another user resume'
);
select throws_ok(
  $$select public.save_resume_version('40000000-0000-4000-8000-000000000004', '{"text":"forged"}'::jsonb)$$,
  'P0002', null, 'cannot save a version to another user resume'
);
select lives_ok(
  $$update public.resumes set title = 'forged update' where id = '40000000-0000-4000-8000-000000000004'$$,
  'cross-user update matches no visible rows'
);
select lives_ok(
  $$delete from public.resumes where id = '40000000-0000-4000-8000-000000000004'$$,
  'cross-user delete matches no visible rows'
);

reset role;
select is(
  (select title from public.resumes where id = '40000000-0000-4000-8000-000000000004'),
  'B resume'::text,
  'cross-user update did not change the other resume'
);
select is(
  (select count(*) from public.resumes where id = '40000000-0000-4000-8000-000000000004'),
  1::bigint,
  'cross-user delete did not remove the other resume'
);

select * from finish();
rollback;