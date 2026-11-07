# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# AeroMind — Project Instructions

## Project overview

AeroMind is a web-based aviation psychology marketplace and development platform for aspiring and student pilots, initially in Europe.

It connects trainees with aviation-psychology professionals and supports a continuous journey:

Discover a professional → Request an assessment → Receive a professional report → Follow a personalized development plan.

The product has three core components:

1. Trainee portal.
2. Psychologist portal.
3. AI-assisted development companion.

The objective is to build a polished, functional MVP suitable for an innovation competition. Treat AeroMind as a serious startup product: question assumptions, evaluate whether a feature earns its place, and raise technical or product risks early.

## Product guardrails

- The core hypothesis is **assessment-to-development**: connecting professional assessment with ongoing learning. It is a hypothesis, not a proven competitor gap.
- Naviqa, Symbiotics, COMPASS and PASS already exist. Naviqa already offers digital assessment workflows, professional review and reporting. Never describe online assessments, booking, AI-assisted reports or digital documentation as new, and never use "first", "only" or "unique" in product copy without checked evidence.
- AeroMind facilitates the process. It does not issue official fitness certificates or replace the professional's judgment.
- Professional assessment and reporting are fundamental. Do not remove them or treat them as optional.
- Keep the revenue model open. Payments are out of scope for the MVP, but do not design the data model around one payer.
- Separate the MVP from the long-term vision. Do not build for future pilots, airlines or flight schools now.

## Repository status

The MVP journey is built and tested for both roles on hosted Supabase (Postgres, in eu-north-1) from this computer. It is not deployed. PDF report upload is not built, and reports are written in the app. AeroMind Academy is being built in phases: the catalogue, simulated enrolment, lesson player, quizzes, progress and learning dashboard exist. The AI tutor and AI development plans are built and tested with real OpenAI answers.

## Commands

```bash
npm run dev                              # Start the dev server
npm run build                            # Production build
npm run lint                             # Lint
npm run typecheck                        # Generate route types, then tsc --noEmit
npm test                                 # All unit and database permission tests (Vitest)
npx vitest run path/to/file.test.ts      # A single test file
npx vitest run -t "test name"            # A single test by name
npm run db:reset                         # Delete built-in database data only, recreated on next start (stop the app first)
npm run demo:reset                       # Preview resetting the demo trainee; add -- --yes to do it (stop the app first on the built-in database)
npm run academy:index                    # Index changed lessons for the AI tutor (needs OPENAI_API_KEY)
npm run academy:index -- --resource <id> --file <path>   # Index a PDF, text or Markdown resource that allows AI use
```

Run lint, type-check and relevant tests after each change. There are no automated browser tests yet, so check the full journey in the browser as both roles.

Node.js is installed per user on this machine. If `node` is not found, add `%LOCALAPPDATA%\Programs\nodejs` to `PATH` for that shell.

## Technology stack

Use:

- Next.js App Router
- TypeScript (strict mode)
- Tailwind CSS
- shadcn/ui
- Supabase Postgres and Auth when `DATABASE_URL` is set, reached through the Session pooler because the direct address is IPv6-only
- PGlite, a built-in database stored in `.data/`, when it is not set
- Signed cookie sessions in both modes
- OpenAI API (optional)
- Zod for validation
- React Hook Form where useful
- Vitest for testing

Follow the conventions of the installed framework versions rather than assuming older ones.

## Environment variables

All are optional. Placeholders live in the committed `.env.example`, and real values go in `.env.local`, which must stay out of Git.

- `DATABASE_URL` (server only): switches the app to Supabase. Encode symbols in the password.
- `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: required with `DATABASE_URL`
- `SUPABASE_SECRET_KEY` (server only): required with `DATABASE_URL`, used only to create demo users
- `SESSION_SECRET`: a random one is generated in `.data/` if unset, and hosted deployments must set it
- `OPENAI_API_KEY` and `OPENAI_MODEL`: without both, plans use the pre-written template and the tutor shows as unavailable
- `AI_PROVIDER`, `AI_CHAT_MODEL`, `AI_EMBEDDING_MODEL`: optional provider settings
- `TUTOR_DAILY_LIMIT` and `TUTOR_GLOBAL_DAILY_LIMIT`: optional limits on tutor questions per day

## User roles

### Trainee

- Register and manage profile.
- Browse aviation-psychology professionals.
- Request assessments.
- Submit demo questionnaire.
- View released professional reports.
- Access approved development plans.
- Complete educational aviation scenarios.
- Track learning progress.

### Psychologist

- Manage professional profile.
- Accept or decline assessment requests.
- Review trainee-submitted information.
- Enter professional recommendations.
- Approve recommendations for AI development plans.
- Create or upload professional reports.

### Admin

- Manage demo data and professional verification labels through seed scripts or SQL. There is no admin UI in the MVP.
- Do not give admins access to private assessment content.

## Core screens

### Public

- `/` — Landing page
- `/professionals` — Professional directory
- `/professionals/[id]` — Professional profile
- `/privacy` — Privacy notice
- `/academy` — Course catalogue
- `/academy/courses/[slug]` — Course page
- `/academy/courses/[slug]/lessons/[lessonId]` — Lesson
- `/academy/instructors/[slug]` — Instructor profile
- `/academy/resources` — Learning resources

### Authentication

- `/sign-in`
- `/sign-up`

### Trainee

- `/trainee/onboarding`
- `/trainee/dashboard`
- `/trainee/profile`
- `/trainee/assessments/[id]`
- `/trainee/reports/[id]`
- `/trainee/development`
- `/trainee/learning`
- `/trainee/scenarios/[id]`

### Psychologist

- `/psychologist/onboarding`
- `/psychologist/dashboard`
- `/psychologist/assessments/[id]`
- `/psychologist/profile`

## Architecture

- All AI provider calls live in `src/lib/ai/`, are server-only, and sit behind `PlanGenerator` and `AiProvider`, so the provider can change without touching product code. With no key, `template.ts` builds the plan and the interface says no AI was used, and the tutor says it is unavailable. It never shows canned answers.
- The tutor retrieves through `search_knowledge`, which runs as the student so RLS decides what the AI can see. It must never read assessment tables. Distress and fitness questions get fixed replies and are not sent to the provider. If the provider flags distress the phrase check missed, the server replaces its answer with `SUPPORT_RESPONSE` and saves nothing. Have a qualified professional review these phrases and replies before real users join. `scripts/index-knowledge.mjs` is an internal command with full database access, and the app must never import it.
- All application data access goes through `asUser()` in `src/lib/db/`. It runs queries with the `authenticated` or `anon` database role and the user's id, so RLS always applies on both databases. Only `src/lib/auth/accounts.ts` may use `systemQuery()`.
- Never call `asUser()` inside another `asUser()`, and never hold a transaction open during an AI call. The built-in database has one connection, so nesting deadlocks.
- `src/lib/db/hosted.ts` applies migrations and seeds demo data on first connection if they are missing. Accounts use Supabase Auth in hosted mode, and the app then issues its own signed session cookie.
- Migrations stay in `supabase/migrations/` and remain Supabase-compatible. `src/lib/db/bootstrap.ts` provides a small stand-in for the `auth` and `storage` schemas, and applies the migrations and demo data on first start.
- This Next.js version differs from older ones: `src/proxy.ts` replaces middleware, and Cache Components is on. Read `node_modules/next/dist/docs/` before using an unfamiliar API.
- Reads of the session, params, searchParams or the database must sit behind a `<Suspense>` boundary, or the build fails. Build pages as a static wrapper around an async component. Public pages that read the database call `await connection()` first, so the build never touches it.
- Call `requireRole()` in every protected page and server action. The proxy only sends visitors with no session to sign-in.
- Never put private assessment data in `use cache`.
- Mutations are server actions in `src/lib/actions/` that authenticate, validate with Zod, then write. Forms use `ActionForm` and its field components, which show errors and refill values.
- Clients change assessment status, consent, approvals, report release and plans only through the SECURITY DEFINER functions in `supabase/migrations/*_workflow.sql`. Internal helpers live in the `app_private` schema.
- New tables get no client access by default. Each migration must add explicit grants, including column lists where fields are protected, plus RLS policies.
- Migrations run once each, tracked in `app_private.schema_migrations` by `applyMigrations()` on both databases at startup. Never edit a migration that has shipped: add a new one.
- Academy outlines are public. Lesson text stays in `lesson_content`, readable only for preview lessons or enrolled students. Enrolment happens only through `enroll_in_course`. Demo catalogue content lives in `src/lib/demo/` and loads through `seedAcademy()`. Raise `ACADEMY_CONTENT_VERSION` when it changes, or existing databases will not update.
- Quiz answers live in `quiz_answer_keys`, which no client can read. Only `submit_quiz` marks answers.
- `tests/db/` runs the real migrations on an in-memory database, using a separate query role for each user. Add a test here for every new permission rule.

## Database entities

Create migrations for:

- `profiles`
- `trainee_profiles`
- `psychologist_profiles`
- `assessment_requests`
- `consents` — purpose, policy version, granted and withdrawn timestamps
- `demo_questionnaire_submissions`
- `professional_recommendations` — includes `competency`, `educational_summary`, and approval fields
- `assessment_private_notes` — readable only by the assigned psychologist
- `professional_reports`
- `development_plans`
- `development_plan_sources` — links each plan to its source recommendations
- `development_plan_items` — activities and their completion state, for progress tracking
- `learning_scenarios`
- `scenario_attempts`
- `audit_events` — append-only, with no private content in event data

Use UUID primary keys, foreign keys, timestamps, indexes and appropriate constraints.

Enable Supabase Row Level Security on every relevant table.

## Critical permissions

- Trainees access only their own private records.
- Psychologists access only requests assigned to them.
- Only assigned psychologists can create and approve recommendations.
- Trainees see only reports released to them.
- AI plans can only be generated from recommendations explicitly approved by the assigned psychologist.
- Verification status must not be editable by a psychologist.
- Users must never be able to assign themselves admin privileges.

Implementation rules that follow from these:

- **Read roles from `profiles` only.** Never use Supabase `user_metadata` for authorization, because users can edit it. Public sign-up may only create `trainee` or `psychologist` roles.
- **RLS works on rows, not columns.** A policy letting psychologists update their own profile also lets them update `verification_status`. Protect `role`, verification, approval and release fields with column privileges, triggers or dedicated database functions, and test each one.
- **Keep private content in its own table.** A row a trainee can read is fully readable, so private notes must never share a row with trainee-visible data.
- **Enforce status transitions on the server.** Clients cannot set `assessment_requests` status directly.
- **Report files, when upload is added, use the private `reports` bucket** already defined in the migrations.

## Assessment workflow

`assessment_requests` status: `requested` → `accepted` or `declined` → `questionnaire_submitted` → `in_review` → `report_released`. A trainee may cancel before review begins.

1. Trainee requests an assessment.
2. Assigned psychologist accepts or declines.
3. Trainee gives consent and submits a demo self-reflection questionnaire.
4. Psychologist reviews the submission.
5. Psychologist records recommendations.
6. Psychologist selects which recommendations are approved for AI use.
7. Psychologist creates or uploads a professional report and releases it.
8. Trainee accesses the released report.
9. Trainee opts in to AI use, and AeroMind generates an educational development plan from approved recommendations.

Questionnaires in the MVP are demonstrations only, not validated psychological instruments.

## AI development companion

Development-plan generation is the `generatePlan` server action. It must:

1. Authenticate the trainee.
2. Verify ownership of the assessment request.
3. Verify that the report has been released.
4. Verify that the trainee has active consent for AI use.
5. Retrieve recommendations for that request.
6. Verify that each recommendation is approved by the assigned psychologist.
7. Send only each recommendation's `competency` and `educational_summary`, plus training stage, language and public Academy lesson and scenario titles. `buildPlanPayload` in `src/lib/ai/plan.ts` is the complete payload.
8. Validate the returned content with Zod. Show a clear error state if validation fails, and never save unvalidated output.
9. Save the plan, its source recommendation IDs and an audit event.

Never send raw questionnaire responses, full reports, private professional notes, unapproved recommendations, or identifiers such as names, emails and user IDs to the AI.

`educational_summary` is written by the psychologist specifically for educational use, and the interface must say that it will be sent to an AI provider. Disable provider-side storage of requests where the API allows it.

The AI may create:

- Educational learning objectives.
- Personalized learning activities.
- Aviation decision-making scenarios.
- Reflective exercises.
- Suggested professional follow-up.

It must never diagnose, determine fitness to fly, predict certification outcomes or claim that learning activity proves psychological fitness.

Development-plan scenarios are pre-authored and choice-based, with authored feedback. The Academy AI tutor is the only free-text AI feature. It must ship with a designed response for users who disclose distress, receive no assessment data, names, emails or user IDs, and stay separate from the development-plan generator.

Show a persistent notice on AI content that it is educational rather than clinical, and offer follow-up with the professional.

## Data protection

- Treat assessment data as GDPR special-category data, even in the demo.
- The MVP uses synthetic data only. Do not collect real assessment data until a legal and privacy review has been completed.
- Any hosted deployment must use EU regions.
- Minimize collection of personal data.
- Consent for the questionnaire and consent for AI use are separate, and AI consent can be withdrawn.

## MVP scope

### Must build

- Landing page.
- Authentication and role-based routing.
- Trainee onboarding and dashboard.
- Psychologist registration, profile and dashboard.
- Professional directory and profiles.
- Assessment request workflow.
- Demo questionnaire with consent.
- Psychologist review dashboard.
- Professional recommendations.
- Report creation/upload.
- AI development plan.
- One interactive aviation scenario.
- Learning progress tracking.

### Do not build yet

- Validated psychometric testing.
- Clinical or regulatory scoring.
- Automated fitness decisions.
- Official certification issuance.
- Video consultation infrastructure.
- Payment processing.
- Airline enterprise portals.
- Complex calendar integrations.
- Free-text AI chat outside the Academy tutor.
- In-app messaging.
- Admin interface.
- Multi-language interface (the MVP interface is English).

Do not add features outside the agreed MVP without discussing them first.

## Design direction

Create a premium, modern aviation-technology product.

- Light neutral backgrounds.
- Deep navy typography.
- Restrained blue accents.
- Clean cards and clear hierarchy.
- Generous spacing.
- Consistent navigation.
- Responsive desktop and mobile layouts.
- Professional but approachable interface.

Avoid generic AI neon styling, excessive gradients and unnecessary cockpit-dashboard aesthetics.

The product should look credible and commercially viable, not like a generic student project.

## Engineering standards

1. Use strict TypeScript.
2. Validate inputs on the server.
3. Enforce permissions server-side and through RLS.
4. Use reusable components.
5. Include loading, empty, error and success states.
6. Make every visible button functional, with no fake links or dead controls.
7. Add tests for critical permissions and workflows. RLS tests must run real queries as separate seeded users, including attempts that should fail.
8. Clearly label sample reports, sample professionals and demo verification. Never present demo questionnaires as validated or demo professionals as genuinely verified.

## Demo reliability

- The seed creates one trainee account, one psychologist account and several clearly labelled sample professionals, using synthetic data.
- The seed includes one completed journey with a pre-generated sample plan, so the demo works without an AI provider or network.
- The sign-in page has one-click demo accounts. Remove them before real users join.
- Before presenting, run `npm run demo:reset -- --yes`, then the full journey on a production build as both roles, then reset again.

## Implementation strategy

Prioritize a complete, secure, working user journey over unnecessary features.

### Completed

The original MVP phases, plus AeroMind Academy, the AI tutor and AI development plans, tested on a production build with hosted Supabase as both roles.

### Remaining before real users

- Decide on hosting, and set `SESSION_SECRET` there.
- Add PDF report upload and automated browser tests.
- Test new sign-up on hosted Supabase with a real mailbox.
- Have qualified professionals review Academy lessons, the scenario, and the tutor distress phrases and replies.
- Confirm OpenAI data handling and region for real data.
- Complete a legal and privacy review, then remove demo sign-in.
