# Proofline

Proofline is a responsive resume workspace built with Next.js App Router, strict TypeScript, and Supabase Auth/Postgres. The marketing site remains public; the dashboard is protected and uses server-verified Supabase claims plus Row Level Security.

## Supabase setup

Requirements: Node.js 20.9 or newer, npm, a Supabase project, and the Supabase CLI for migrations and database tests.

1. Create a project at [supabase.com/dashboard](https://supabase.com/dashboard).
2. In **Project Settings → API**, copy the Project URL and the **publishable** key (legacy anon keys are also accepted). Never use a secret or service-role key in this app.
3. Copy `.env.example` to `.env.local` and set `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, and `NEXT_PUBLIC_SITE_URL`. Keep `.env.local` out of version control.
4. In **Authentication → URL Configuration**, set the local Site URL to `http://localhost:3000` and allow `http://localhost:3000/auth/callback`. Add the matching production URL after deployment.
5. Enable email/password sign-up in **Authentication → Providers → Email** and configure email confirmation/SMTP for the environment where users will register.
6. Link the repository and apply the migration:

	```bash
	npx supabase login
	npx supabase link --project-ref YOUR_PROJECT_REF
	npx supabase db push
	```

7. Run `npm run dev`. The marketing site works without Supabase credentials; auth and dashboard routes show setup guidance until values are configured.

## Database tests

`supabase/tests/database/rls.test.sql` contains the pgTAP isolation tests. With Docker and the Supabase CLI installed, run:

```bash
npx supabase start
npx supabase test db
```

The tests create two users and verify read/write isolation and owner-safe resume/version/job/analysis relationships. They run in a transaction and roll back their fixtures.

## Security and scope

- `src/proxy.ts` refreshes SSR cookies using `auth.getClaims()` on protected/auth routes.
- Dashboard pages, data access, and Server Actions verify claims on the server. Writes derive the owner from those claims, never from a browser-supplied user ID.
- RLS is enabled on all user data tables. Composite owner foreign keys prevent cross-user references.
- Only a publishable key or legacy anon key is accepted; no service-role client exists.
- Resume editing stores schema-validated structured snapshots in immutable versions. Job-specific copies are separate branches and never overwrite the original. `ResumeParser` accepts parsed file bytes and returns the same `ResumeData` model; file extraction/private Storage, AI matching, and analysis generation are not implemented yet.

## Checks

```bash
npm run lint
npm run typecheck
npm run build
```

## Next.js development

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

The marketing homepage is in `src/app/page.tsx`; dashboard routes are under `src/app/dashboard`.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
