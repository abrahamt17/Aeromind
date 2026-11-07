// Returns the demo trainee to its starting state. Run before presenting.
//
//   npm run demo:reset          Shows what would be removed, and changes nothing
//   npm run demo:reset -- --yes Removes it
//
// It only touches the demo trainee account. The seeded sample journey stays, and other
// accounts are never affected. Audit events are append-only, so they are kept.

import { loadSettings, openDatabase } from "./db.mjs";

const DEMO_TRAINEE_EMAIL = "demo.trainee@aeromind.example";
const confirmed = process.argv.includes("--yes");

const COUNTS = {
  "Extra assessments, with their plans, reports and notes": `
    select count(*)::int as total from public.assessment_requests r
    where r.trainee_id = $1 and r.id not in (
      select p.assessment_request_id from public.development_plans p where p.is_sample
    )`,
  "Scenario attempts": "select count(*)::int as total from public.scenario_attempts where trainee_id = $1",
  "Lesson progress": "select count(*)::int as total from public.lesson_progress where user_id = $1",
  "Quiz attempts": "select count(*)::int as total from public.quiz_attempts where user_id = $1",
  "Course enrolments": "select count(*)::int as total from public.course_enrollments where user_id = $1",
  "Saved resources": "select count(*)::int as total from public.saved_resources where user_id = $1",
  "AI tutor conversations": "select count(*)::int as total from public.ai_conversations where user_id = $1",
  "Completed plan activities": `
    select count(*)::int as total from public.development_plan_items i
    join public.development_plans p on p.id = i.plan_id
    where p.trainee_id = $1 and p.is_sample and i.completed_at is not null`,
};

const RESETS = [
  `delete from public.assessment_requests r
   where r.trainee_id = $1 and r.id not in (
     select p.assessment_request_id from public.development_plans p where p.is_sample
   )`,
  "delete from public.scenario_attempts where trainee_id = $1",
  "delete from public.lesson_progress where user_id = $1",
  "delete from public.quiz_attempts where user_id = $1",
  "delete from public.course_enrollments where user_id = $1",
  "delete from public.saved_resources where user_id = $1",
  "delete from public.ai_conversations where user_id = $1",
  "delete from public.ai_usage_daily where user_id = $1",
  `update public.development_plan_items i set completed_at = null
   from public.development_plans p
   where p.id = i.plan_id and p.trainee_id = $1 and p.is_sample`,
];

loadSettings();
const db = await openDatabase();

try {
  const [trainee] = await db.query("select id from auth.users where email = $1", [DEMO_TRAINEE_EMAIL]);
  if (!trainee) throw new Error("The demo trainee account was not found.");

  for (const [label, query] of Object.entries(COUNTS)) {
    const [{ total }] = await db.query(query, [trainee.id]);
    console.log(`${String(total).padStart(4)}  ${label}`);
  }

  if (confirmed) {
    await db.transaction(async (tx) => {
      for (const statement of RESETS) await tx.query(statement, [trainee.id]);
    });
    console.log("\nThe demo trainee has been reset.");
  } else {
    console.log("\nNothing was changed. Run npm run demo:reset -- --yes to remove these.");
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  await db.close();
}
