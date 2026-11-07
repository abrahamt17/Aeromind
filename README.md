# AeroMind

A prototype aviation psychology platform that connects aspiring and student pilots with professionals, then supports their development through educational plans. All professionals, questionnaires and reports are labelled samples.

## Run it

You need [Node.js](https://nodejs.org). With no settings, the app runs on a built-in database. To use Supabase, copy `.env.example` to `.env.local` and fill it in. The tables and demo data are created on first start.

```bash
npm install
npm run dev
```

Open <http://localhost:3000>. The first request creates the database and loads the demo data, so it can take a few seconds.

For a live demo, use the faster production version:

```bash
npm run build
npm start
```

## Demo journey

On the sign-in page, use **Demo trainee** and **Demo psychologist**.

1. As the trainee, find Dr Elena Marsh (sample) and send a request.
2. As the psychologist, accept it.
3. As the trainee, complete the demo questionnaire.
4. As the psychologist, begin the review, add and approve a recommendation, then create and release a report.
5. As the trainee, read the report, create a development plan and work through the scenario.

To return to the original built-in demo data, stop the app and run `npm run db:reset`. This does not affect Supabase.

## Check it

```bash
npm test
npm run lint
npm run typecheck
```
