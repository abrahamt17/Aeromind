# Deploying AeroMind to Vercel

This puts the competition prototype online in an EU region, using the existing Supabase project. It takes about 20 minutes.

The hosted app and your computer use **the same database**. Anything done on one appears on the other, and `npm run demo:reset` on your computer also resets the hosted demo.

## 1. Replace the exposed Supabase secrets

The secret key and database password were shared in a chat earlier, so replace them before they go anywhere else.

1. In Supabase, open **Project Settings > API Keys**. Create a new **secret key**, then delete the old one.
2. Open **Database > Settings** and click **Reset database password**. Use a long password made of letters and numbers only, so it needs no encoding.
3. Update `SUPABASE_SECRET_KEY` and the password inside `DATABASE_URL` in `.env.local` on your computer.
4. Run `npm start` and check that the app still loads.

Never paste keys or passwords into a chat, a document or a commit.

## 2. Collect the values Vercel needs

| Name | Where to find it |
|---|---|
| `DATABASE_URL` | Supabase > **Connect** > **Transaction pooler** (port 6543). Replace `[YOUR-PASSWORD]` with the new password. |
| `NEXT_PUBLIC_SUPABASE_URL` | Same value as in `.env.local` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Same value as in `.env.local` |
| `SUPABASE_SECRET_KEY` | The new secret key from step 1 |
| `SESSION_SECRET` | Create a new one (see below). Do not reuse anything. |
| `OPENAI_API_KEY` | Same value as in `.env.local` |
| `OPENAI_MODEL` | `gpt-5.4-mini` |
| `TUTOR_GLOBAL_DAILY_LIMIT` | `200` is a sensible public limit |

The **Transaction pooler** suits hosting, because many short-lived servers share a few database connections. Your computer can keep using the Session pooler.

To create a `SESSION_SECRET`, run this in the project folder and copy the output:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

## 3. Create the Vercel project

1. Go to [vercel.com](https://vercel.com) and sign up with your GitHub account.
2. Click **Add New > Project** and import **abrahamt17/Aeromind**.
3. Leave the framework as **Next.js** and the build settings as they are.
4. Open **Environment Variables** and add every value from step 2.
5. Click **Deploy**.

`vercel.json` runs the app in **arn1 (Stockholm)**, next to the Supabase database in eu-north-1. That keeps data in the EU and makes pages much faster than from a laptop.

If the deployment fails, open the build log in Vercel. A message naming `DATABASE_URL` or `SESSION_SECRET` means that value is missing or too short.

## 4. After the first deployment

1. Open the Vercel link. Check the Academy, then sign in as **Demo trainee** and **Demo psychologist**.
2. In Supabase, open **Authentication > URL Configuration** and set **Site URL** to the Vercel link. Email links then point to the hosted app.
3. In OpenAI, check that the project has a monthly spending limit.
4. Run the full journey once as both roles, then run `npm run demo:reset -- --yes` on your computer.

## Things to know

- **Anyone with the link can use the demo accounts.** All data is synthetic, and the tutor limits cap AI costs. Share the link only with judges and your team, and reset before presenting.
- **Search engines are told not to list the site**, because it is a prototype with sample content.
- **Each push to `main` redeploys automatically.** Pushes to other branches create separate preview links.
- **Hosting must stay in the EU.** Do not change the region in `vercel.json`.
- **This is not ready for real users.** That still needs the legal and privacy review, professional review of content and safety replies, and removal of the demo sign-in.
