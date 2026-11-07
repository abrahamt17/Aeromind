import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { TestDatabase } from "./harness";

let db: TestDatabase;
let traineeA: string;
let traineeB: string;
let psychA: string;
let psychB: string;
let hiddenPsych: string;
let scenarioId: string;

const PRIVATE_TABLES = [
  "profiles",
  "trainee_profiles",
  "assessment_requests",
  "consents",
  "demo_questionnaire_submissions",
  "professional_recommendations",
  "assessment_private_notes",
  "professional_reports",
  "development_plans",
  "development_plan_sources",
  "development_plan_items",
  "learning_scenarios",
  "scenario_attempts",
  "audit_events",
];

beforeAll(async () => {
  db = await TestDatabase.create();

  traineeA = await db.createUser({ role: "trainee", display_name: "Trainee A" });
  traineeB = await db.createUser({ role: "trainee", display_name: "Trainee B" });
  psychA = await db.createUser({ role: "psychologist", display_name: "Psych A" });
  psychB = await db.createUser({ role: "psychologist", display_name: "Psych B" });
  hiddenPsych = await db.createUser({ role: "psychologist", display_name: "Hidden" });

  await db.admin(
    `update public.psychologist_profiles
     set headline = 'Aviation psychologist', bio = 'Sample bio', published = true, is_sample = true
     where user_id = any ($1)`,
    [[psychA, psychB]],
  );

  const [scenario] = await db.admin<{ id: string }>(
    `insert into public.learning_scenarios (slug, title, summary, competency, content, published)
     values ('test-scenario', 'Scenario', 'Summary', 'workload_management', '{}', true)
     returning id`,
  );
  scenarioId = scenario.id;
}, 60_000);

afterAll(async () => {
  await db.close();
});

// A fresh pairing for each test, because only one open request is allowed per pair.
let trainee: string;
let otherTrainee: string;
let psych: string;
let otherPsych: string;

beforeEach(async () => {
  trainee = await db.createUser({ role: "trainee", display_name: "Current trainee" });
  otherTrainee = traineeB;
  psych = psychA;
  otherPsych = psychB;
});

async function createRequest(): Promise<string> {
  const [row] = await db.as<{ id: string }>(
    trainee,
    "select public.request_assessment($1, 'Hello') as id",
    [psych],
  );
  return row.id;
}

async function acceptedRequest(): Promise<string> {
  const id = await createRequest();
  await db.as(psych, "select public.respond_to_assessment_request($1, true)", [id]);
  return id;
}

async function submittedRequest(): Promise<string> {
  const id = await acceptedRequest();
  await db.as(trainee, "select public.grant_consent($1, 'questionnaire_processing', 'v1')", [id]);
  await db.as(trainee, "select public.submit_demo_questionnaire($1, 'demo-v1', '{\"q1\": 3}')", [id]);
  return id;
}

async function requestInReview(): Promise<string> {
  const id = await submittedRequest();
  await db.as(psych, "select public.begin_assessment_review($1)", [id]);
  return id;
}

async function addRecommendation(requestId: string): Promise<string> {
  const [row] = await db.as<{ id: string }>(
    psych,
    `insert into public.professional_recommendations
       (assessment_request_id, competency, recommendation_text, educational_summary)
     values ($1, 'workload_management', 'Practise prioritising', 'Prioritise tasks under workload')
     returning id`,
    [requestId],
  );
  return row.id;
}

async function addDraftReport(requestId: string): Promise<string> {
  const [row] = await db.as<{ id: string }>(
    psych,
    `insert into public.professional_reports (assessment_request_id, title, body)
     values ($1, 'Sample report', 'Sample content') returning id`,
    [requestId],
  );
  return row.id;
}

async function releasedRequest(): Promise<{ requestId: string; approved: string; unapproved: string }> {
  const requestId = await requestInReview();
  const approved = await addRecommendation(requestId);
  const unapproved = await addRecommendation(requestId);
  await db.as(psych, "select public.set_recommendation_ai_approval($1, true)", [approved]);
  const reportId = await addDraftReport(requestId);
  await db.as(psych, "select public.release_report($1)", [reportId]);
  return { requestId, approved, unapproved };
}

const PLAN_ITEMS = JSON.stringify([
  { item_type: "activity", title: "Practise", description: "Practise prioritising" },
]);

function savePlan(caller: string, requestId: string, recommendationIds: string[]) {
  return db.as<{ id: string }>(
    caller,
    "select public.save_development_plan($1, 'Plan', 'Summary', 'en', 'test-model', $2, $3) as id",
    [requestId, recommendationIds, PLAN_ITEMS],
  );
}

describe("database configuration", () => {
  it("enables RLS on every public table", async () => {
    const rows = await db.admin<{ tablename: string }>(
      "select tablename from pg_tables where schemaname = 'public' and not rowsecurity",
    );
    expect(rows).toEqual([]);
  });

  it("gives clients no audit access", async () => {
    await expect(db.as(trainee, "select * from public.audit_events")).rejects.toThrow(/permission denied/);
    await expect(db.as(psych, "select * from public.audit_events")).rejects.toThrow(/permission denied/);
  });

  it("keeps audit events append-only even for full-access callers", async () => {
    await createRequest();
    await expect(db.admin("delete from public.audit_events")).rejects.toThrow(/append-only/);
    await expect(db.admin("update public.audit_events set event_type = 'changed'")).rejects.toThrow(/append-only/);
  });

  it("does not let clients call internal functions", async () => {
    await expect(db.as(trainee, "select app_private.require_role('trainee')")).rejects.toThrow(/permission denied/);
    await expect(
      db.as(trainee, "select app_private.log_event('fake', 'fake', null)"),
    ).rejects.toThrow(/permission denied/);
  });
});

describe("sign-up and roles", () => {
  it("creates the matching profile for each public role", async () => {
    const [t] = await db.admin<{ role: string }>("select role from public.profiles where id = $1", [traineeA]);
    const [p] = await db.admin<{ role: string }>("select role from public.profiles where id = $1", [psychA]);
    expect(t.role).toBe("trainee");
    expect(p.role).toBe("psychologist");
    expect(await db.admin("select 1 from public.trainee_profiles where user_id = $1", [traineeA])).toHaveLength(1);
    expect(await db.admin("select 1 from public.psychologist_profiles where user_id = $1", [psychA])).toHaveLength(1);
  });

  it("never grants admin from sign-up metadata", async () => {
    const id = await db.createUser({ role: "admin", display_name: "Attacker" });
    const [row] = await db.admin<{ role: string }>("select role from public.profiles where id = $1", [id]);
    expect(row.role).toBe("trainee");
  });

  it("stops users changing their own role", async () => {
    await expect(
      db.as(trainee, "update public.profiles set role = 'admin' where id = $1", [trainee]),
    ).rejects.toThrow(/permission denied/);
  });

  it("stops users creating profiles directly", async () => {
    await expect(
      db.as(trainee, "insert into public.profiles (id, role, display_name) values ($1, 'admin', 'x')", [trainee]),
    ).rejects.toThrow(/permission denied/);
  });

  it("lets users change their own display name, and nobody else's", async () => {
    await db.as(trainee, "update public.profiles set display_name = 'Renamed' where id = $1", [trainee]);
    const [own] = await db.admin<{ display_name: string }>("select display_name from public.profiles where id = $1", [trainee]);
    expect(own.display_name).toBe("Renamed");

    await db.as(trainee, "update public.profiles set display_name = 'Hacked' where id = $1", [traineeB]);
    const [other] = await db.admin<{ display_name: string }>("select display_name from public.profiles where id = $1", [traineeB]);
    expect(other.display_name).toBe("Trainee B");
  });
});

describe("professional directory", () => {
  it("shows anonymous visitors published professionals only", async () => {
    const rows = await db.as<{ user_id: string }>(null, "select user_id from public.psychologist_profiles");
    const ids = rows.map((r) => r.user_id);
    expect(ids).toContain(psychA);
    expect(ids).not.toContain(hiddenPsych);
  });

  it.each(PRIVATE_TABLES)("denies anonymous access to %s", async (table) => {
    await expect(db.as(null, `select * from public.${table}`)).rejects.toThrow(/permission denied/);
  });

  it("lets psychologists edit their profile but not their verification or sample label", async () => {
    await db.as(psych, "update public.psychologist_profiles set bio = 'Updated bio' where user_id = $1", [psych]);
    const [row] = await db.admin<{ bio: string }>("select bio from public.psychologist_profiles where user_id = $1", [psych]);
    expect(row.bio).toBe("Updated bio");

    await expect(
      db.as(psych, "update public.psychologist_profiles set verification_status = 'verified' where user_id = $1", [psych]),
    ).rejects.toThrow(/permission denied/);
    await expect(
      db.as(psych, "update public.psychologist_profiles set is_sample = false where user_id = $1", [psych]),
    ).rejects.toThrow(/permission denied/);
  });

  it("stops psychologists editing each other", async () => {
    await db.as(otherPsych, "update public.psychologist_profiles set bio = 'Hacked' where user_id = $1", [psych]);
    const [row] = await db.admin<{ bio: string }>("select bio from public.psychologist_profiles where user_id = $1", [psych]);
    expect(row.bio).not.toBe("Hacked");
  });

  it("refuses requests to an unpublished professional", async () => {
    await expect(
      db.as(trainee, "select public.request_assessment($1, null)", [hiddenPsych]),
    ).rejects.toThrow(/not accepting requests/);
  });

  it("refuses a second open request to the same professional", async () => {
    await createRequest();
    await expect(createRequest()).rejects.toThrow(/duplicate key|unique/i);
  });

  it("only lets trainees request assessments", async () => {
    await expect(
      db.as(psych, "select public.request_assessment($1, null)", [otherPsych]),
    ).rejects.toThrow(/not available/);
  });
});

describe("assessment status", () => {
  it("cannot be changed directly by either participant", async () => {
    const id = await createRequest();
    for (const caller of [trainee, psych]) {
      await expect(
        db.as(caller, "update public.assessment_requests set status = 'report_released' where id = $1", [id]),
      ).rejects.toThrow(/permission denied/);
    }
    await expect(
      db.as(trainee, "insert into public.assessment_requests (trainee_id, psychologist_id) values ($1, $2)", [trainee, psych]),
    ).rejects.toThrow(/permission denied/);
  });

  it("is hidden from people outside the request", async () => {
    const id = await createRequest();
    expect(await db.as(otherTrainee, "select 1 from public.assessment_requests where id = $1", [id])).toEqual([]);
    expect(await db.as(otherPsych, "select 1 from public.assessment_requests where id = $1", [id])).toEqual([]);
  });

  it("can only be answered by the assigned psychologist", async () => {
    const id = await createRequest();
    await expect(
      db.as(otherPsych, "select public.respond_to_assessment_request($1, true)", [id]),
    ).rejects.toThrow(/not found/);
    await expect(
      db.as(trainee, "select public.respond_to_assessment_request($1, true)", [id]),
    ).rejects.toThrow(/not available/);
  });

  it("cannot be answered twice", async () => {
    const id = await acceptedRequest();
    await expect(
      db.as(psych, "select public.respond_to_assessment_request($1, false)", [id]),
    ).rejects.toThrow(/already been answered/);
  });

  it("can be cancelled by the trainee only before review begins", async () => {
    const early = await submittedRequest();
    await db.as(trainee, "select public.cancel_assessment_request($1)", [early]);
    const [row] = await db.admin<{ status: string }>("select status from public.assessment_requests where id = $1", [early]);
    expect(row.status).toBe("cancelled");

    trainee = await db.createUser({ role: "trainee", display_name: "Second trainee" });
    const late = await requestInReview();
    await expect(
      db.as(trainee, "select public.cancel_assessment_request($1)", [late]),
    ).rejects.toThrow(/no longer be cancelled/);
  });

  it("cannot skip a step", async () => {
    const id = await createRequest();
    await expect(db.as(psych, "select public.begin_assessment_review($1)", [id])).rejects.toThrow(/not ready/);
  });
});

describe("questionnaire", () => {
  it("cannot be submitted before the request is accepted", async () => {
    const id = await createRequest();
    await db.as(trainee, "select public.grant_consent($1, 'questionnaire_processing', 'v1')", [id]);
    await expect(
      db.as(trainee, "select public.submit_demo_questionnaire($1, 'demo-v1', '{}')", [id]),
    ).rejects.toThrow(/not open/);
  });

  it("requires active consent", async () => {
    const id = await acceptedRequest();
    await expect(
      db.as(trainee, "select public.submit_demo_questionnaire($1, 'demo-v1', '{}')", [id]),
    ).rejects.toThrow(/Consent is required/);

    await db.as(trainee, "select public.grant_consent($1, 'questionnaire_processing', 'v1')", [id]);
    await db.as(trainee, "select public.withdraw_consent($1, 'questionnaire_processing')", [id]);
    await expect(
      db.as(trainee, "select public.submit_demo_questionnaire($1, 'demo-v1', '{}')", [id]),
    ).rejects.toThrow(/Consent is required/);
  });

  it("is visible to the trainee and assigned psychologist only", async () => {
    const id = await submittedRequest();
    const sql = "select responses from public.demo_questionnaire_submissions where assessment_request_id = $1";
    expect(await db.as(trainee, sql, [id])).toHaveLength(1);
    expect(await db.as(psych, sql, [id])).toHaveLength(1);
    expect(await db.as(otherPsych, sql, [id])).toEqual([]);
    expect(await db.as(otherTrainee, sql, [id])).toEqual([]);
  });

  it("is hidden from the psychologist once the trainee cancels", async () => {
    const id = await submittedRequest();
    await db.as(trainee, "select public.cancel_assessment_request($1)", [id]);
    expect(
      await db.as(psych, "select 1 from public.demo_questionnaire_submissions where assessment_request_id = $1", [id]),
    ).toEqual([]);
  });

  it("cannot be submitted for someone else", async () => {
    const id = await acceptedRequest();
    await expect(
      db.as(otherTrainee, "select public.grant_consent($1, 'questionnaire_processing', 'v1')", [id]),
    ).rejects.toThrow(/not found/);
    await expect(
      db.as(otherTrainee, "select public.submit_demo_questionnaire($1, 'demo-v1', '{}')", [id]),
    ).rejects.toThrow(/not found/);
  });
});

describe("recommendations", () => {
  it("can only be created by the assigned psychologist during review", async () => {
    const id = await requestInReview();
    const sql = `insert into public.professional_recommendations
      (assessment_request_id, competency, recommendation_text, educational_summary)
      values ($1, 'decision_making', 'Text', 'Summary')`;
    await expect(db.as(otherPsych, sql, [id])).rejects.toThrow(/row-level security/);
    await expect(db.as(trainee, sql, [id])).rejects.toThrow(/row-level security/);

    const notInReview = await acceptedRequestForFreshTrainee();
    await expect(db.as(psych, sql, [notInReview])).rejects.toThrow(/row-level security/);
  });

  async function acceptedRequestForFreshTrainee(): Promise<string> {
    trainee = await db.createUser({ role: "trainee", display_name: "Another trainee" });
    return acceptedRequest();
  }

  it("cannot have approval set through a direct write", async () => {
    const id = await requestInReview();
    const recommendation = await addRecommendation(id);
    await expect(
      db.as(psych, "update public.professional_recommendations set approved_for_ai = true where id = $1", [recommendation]),
    ).rejects.toThrow(/permission denied/);
    await expect(
      db.as(
        psych,
        `insert into public.professional_recommendations
          (assessment_request_id, competency, recommendation_text, educational_summary, approved_for_ai)
         values ($1, 'decision_making', 'Text', 'Summary', true)`,
        [id],
      ),
    ).rejects.toThrow(/permission denied/);
  });

  it("can only be approved by the assigned psychologist", async () => {
    const recommendation = await addRecommendation(await requestInReview());
    await expect(
      db.as(otherPsych, "select public.set_recommendation_ai_approval($1, true)", [recommendation]),
    ).rejects.toThrow(/not found/);
    await expect(
      db.as(trainee, "select public.set_recommendation_ai_approval($1, true)", [recommendation]),
    ).rejects.toThrow(/not available/);
  });

  it("lose AI approval when the approved wording changes", async () => {
    const recommendation = await addRecommendation(await requestInReview());
    await db.as(psych, "select public.set_recommendation_ai_approval($1, true)", [recommendation]);
    await db.as(
      psych,
      "update public.professional_recommendations set educational_summary = 'Changed wording' where id = $1",
      [recommendation],
    );
    const [row] = await db.admin<{ approved_for_ai: boolean; approved_by: string | null }>(
      "select approved_for_ai, approved_by from public.professional_recommendations where id = $1",
      [recommendation],
    );
    expect(row.approved_for_ai).toBe(false);
    expect(row.approved_by).toBeNull();
  });

  it("stay hidden from the trainee until release, and lock afterwards", async () => {
    const id = await requestInReview();
    const recommendation = await addRecommendation(id);
    const sql = "select 1 from public.professional_recommendations where id = $1";
    expect(await db.as(trainee, sql, [recommendation])).toEqual([]);

    const report = await addDraftReport(id);
    await db.as(psych, "select public.release_report($1)", [report]);
    expect(await db.as(trainee, sql, [recommendation])).toHaveLength(1);
    expect(await db.as(otherTrainee, sql, [recommendation])).toEqual([]);

    await db.as(
      psych,
      "update public.professional_recommendations set recommendation_text = 'Changed' where id = $1",
      [recommendation],
    );
    const [row] = await db.admin<{ recommendation_text: string }>(
      "select recommendation_text from public.professional_recommendations where id = $1",
      [recommendation],
    );
    expect(row.recommendation_text).toBe("Practise prioritising");
  });
});

describe("private notes", () => {
  it("stay with the assigned psychologist, even after release", async () => {
    const id = await requestInReview();
    await db.as(psych, "insert into public.assessment_private_notes (assessment_request_id, body) values ($1, 'Private')", [id]);
    const report = await addDraftReport(id);
    await db.as(psych, "select public.release_report($1)", [report]);

    const sql = "select body from public.assessment_private_notes where assessment_request_id = $1";
    expect(await db.as(psych, sql, [id])).toHaveLength(1);
    expect(await db.as(trainee, sql, [id])).toEqual([]);
    expect(await db.as(otherPsych, sql, [id])).toEqual([]);
  });

  it("cannot be written by anyone else", async () => {
    const id = await requestInReview();
    const sql = "insert into public.assessment_private_notes (assessment_request_id, body) values ($1, 'Fake')";
    await expect(db.as(trainee, sql, [id])).rejects.toThrow(/row-level security/);
    await expect(db.as(otherPsych, sql, [id])).rejects.toThrow(/row-level security/);
  });
});

describe("reports", () => {
  it("are hidden from the trainee until released", async () => {
    const id = await requestInReview();
    await addDraftReport(id);
    const sql = "select title from public.professional_reports where assessment_request_id = $1";
    expect(await db.as(trainee, sql, [id])).toEqual([]);
    expect(await db.as(otherPsych, sql, [id])).toEqual([]);
    expect(await db.as(psych, sql, [id])).toHaveLength(1);
  });

  it("cannot be released through a direct write, or by someone else", async () => {
    const id = await requestInReview();
    const report = await addDraftReport(id);
    await expect(
      db.as(psych, "update public.professional_reports set released_at = now() where id = $1", [report]),
    ).rejects.toThrow(/permission denied/);
    await expect(db.as(otherPsych, "select public.release_report($1)", [report])).rejects.toThrow(/not found/);
    await expect(db.as(trainee, "select public.release_report($1)", [report])).rejects.toThrow(/not available/);
  });

  it("cannot drop their sample label", async () => {
    const report = await addDraftReport(await requestInReview());
    await expect(
      db.as(psych, "update public.professional_reports set is_sample = false where id = $1", [report]),
    ).rejects.toThrow(/permission denied/);
  });

  it("become visible to their trainee on release and then lock", async () => {
    const id = await requestInReview();
    const report = await addDraftReport(id);
    await db.as(psych, "select public.release_report($1)", [report]);

    const sql = "select title from public.professional_reports where id = $1";
    expect(await db.as(trainee, sql, [report])).toHaveLength(1);
    expect(await db.as(otherTrainee, sql, [report])).toEqual([]);

    await db.as(psych, "update public.professional_reports set title = 'Changed' where id = $1", [report]);
    const [row] = await db.admin<{ title: string }>("select title from public.professional_reports where id = $1", [report]);
    expect(row.title).toBe("Sample report");
  });

  it("cannot point at another request's file", async () => {
    const id = await requestInReview();
    await expect(
      db.as(
        psych,
        "insert into public.professional_reports (assessment_request_id, title, storage_path) values ($1, 'Report', $2)",
        [id, "00000000-0000-0000-0000-000000000000/report.pdf"],
      ),
    ).rejects.toThrow(/report_file_belongs_to_request/);
  });
});

describe("report files", () => {
  async function storeFile(requestId: string): Promise<string> {
    const name = `${requestId}/report.pdf`;
    await db.as(psych, "insert into storage.objects (bucket_id, name) values ('reports', $1)", [name]);
    return name;
  }

  it("can only be uploaded by the assigned psychologist during review", async () => {
    const id = await requestInReview();
    const sql = "insert into storage.objects (bucket_id, name) values ('reports', $1)";
    await expect(db.as(otherPsych, sql, [`${id}/fake.pdf`])).rejects.toThrow(/row-level security/);
    await expect(db.as(trainee, sql, [`${id}/fake.pdf`])).rejects.toThrow(/row-level security/);
    await expect(db.as(psych, sql, ["not-a-request/fake.pdf"])).rejects.toThrow(/row-level security/);
  });

  it("reach the trainee only after the report is released", async () => {
    const id = await requestInReview();
    const name = await storeFile(id);
    const sql = "select name from storage.objects where name = $1";
    const [report] = await db.as<{ id: string }>(
      psych,
      "insert into public.professional_reports (assessment_request_id, title, storage_path) values ($1, 'Report', $2) returning id",
      [id, name],
    );

    expect(await db.as(psych, sql, [name])).toHaveLength(1);
    expect(await db.as(trainee, sql, [name])).toEqual([]);
    expect(await db.as(otherPsych, sql, [name])).toEqual([]);

    await db.as(psych, "select public.release_report($1)", [report.id]);
    expect(await db.as(trainee, sql, [name])).toHaveLength(1);
    expect(await db.as(otherTrainee, sql, [name])).toEqual([]);
    await expect(db.as(null, sql, [name])).rejects.toThrow(/permission denied/);
  });
});

describe("AI development plans", () => {
  it("require a released report", async () => {
    const id = await requestInReview();
    await db.as(trainee, "select public.grant_consent($1, 'ai_development_plan', 'v1')", [id]);
    await expect(
      db.as(trainee, "select public.get_plan_generation_input($1)", [id]),
    ).rejects.toThrow(/after your report is released/);
  });

  it("require the trainee's own active consent", async () => {
    const { requestId, approved } = await releasedRequest();
    await expect(
      db.as(trainee, "select public.get_plan_generation_input($1)", [requestId]),
    ).rejects.toThrow(/Consent is required/);

    await db.as(trainee, "select public.grant_consent($1, 'ai_development_plan', 'v1')", [requestId]);
    await db.as(trainee, "select public.withdraw_consent($1, 'ai_development_plan')", [requestId]);
    await expect(
      db.as(trainee, "select public.get_plan_generation_input($1)", [requestId]),
    ).rejects.toThrow(/Consent is required/);
    await expect(savePlan(trainee, requestId, [approved])).rejects.toThrow(/Consent is required/);
  });

  it("are not available to anyone else", async () => {
    const { requestId, approved } = await releasedRequest();
    await db.as(trainee, "select public.grant_consent($1, 'ai_development_plan', 'v1')", [requestId]);
    await expect(
      db.as(otherTrainee, "select public.get_plan_generation_input($1)", [requestId]),
    ).rejects.toThrow(/not found/);
    await expect(
      db.as(psych, "select public.get_plan_generation_input($1)", [requestId]),
    ).rejects.toThrow(/not available/);
    await expect(savePlan(otherTrainee, requestId, [approved])).rejects.toThrow(/not found/);
  });

  it("receive only approved recommendations and only the permitted fields", async () => {
    const { requestId, approved, unapproved } = await releasedRequest();
    await db.as(psych, "insert into public.assessment_private_notes (assessment_request_id, body) values ($1, 'SECRET NOTE')", [requestId]);
    await db.as(trainee, "select public.grant_consent($1, 'ai_development_plan', 'v1')", [requestId]);

    const [row] = await db.as<{ input: Record<string, unknown> & { recommendations: Record<string, unknown>[] } }>(
      trainee,
      "select public.get_plan_generation_input($1) as input",
      [requestId],
    );

    expect(Object.keys(row.input).sort()).toEqual(["language", "recommendations", "training_stage"]);
    expect(row.input.recommendations.map((r) => r.id)).toEqual([approved]);
    expect(Object.keys(row.input.recommendations[0]).sort()).toEqual(["competency", "educational_summary", "id"]);

    const sent = JSON.stringify(row.input);
    expect(sent).not.toContain(unapproved);
    expect(sent).not.toContain("SECRET NOTE");
    expect(sent).not.toContain("Practise prioritising");
    expect(sent).not.toContain(trainee);
  });

  it("refuse unapproved or foreign recommendations", async () => {
    const { requestId, approved, unapproved } = await releasedRequest();
    await db.as(trainee, "select public.grant_consent($1, 'ai_development_plan', 'v1')", [requestId]);

    await expect(savePlan(trainee, requestId, [unapproved])).rejects.toThrow(/approved by your professional/);
    await expect(savePlan(trainee, requestId, [approved, unapproved])).rejects.toThrow(/approved by your professional/);
    await expect(savePlan(trainee, requestId, [])).rejects.toThrow(/approved by your professional/);

    const first = trainee;
    trainee = await db.createUser({ role: "trainee", display_name: "Foreign trainee" });
    const foreign = await releasedRequest();
    await expect(savePlan(first, requestId, [foreign.approved])).rejects.toThrow(/approved by your professional/);
  });

  it("save sources, items and an audit event, and stay private", async () => {
    const { requestId, approved } = await releasedRequest();
    await db.as(trainee, "select public.grant_consent($1, 'ai_development_plan', 'v1')", [requestId]);
    const [plan] = await savePlan(trainee, requestId, [approved]);

    const planSql = "select id from public.development_plans where id = $1";
    expect(await db.as(trainee, planSql, [plan.id])).toHaveLength(1);
    expect(await db.as(otherTrainee, planSql, [plan.id])).toEqual([]);
    expect(await db.as(psych, planSql, [plan.id])).toEqual([]);

    const sources = await db.as<{ recommendation_id: string }>(
      trainee,
      "select recommendation_id from public.development_plan_sources where plan_id = $1",
      [plan.id],
    );
    expect(sources.map((s) => s.recommendation_id)).toEqual([approved]);

    const events = await db.admin("select 1 from public.audit_events where entity_id = $1", [plan.id]);
    expect(events).toHaveLength(1);

    await expect(savePlan(trainee, requestId, [approved])).rejects.toThrow(/duplicate key|unique/i);
  });

  it("cannot be written directly", async () => {
    const { requestId } = await releasedRequest();
    await expect(
      db.as(
        trainee,
        "insert into public.development_plans (assessment_request_id, trainee_id, title, summary) values ($1, $2, 'Fake', 'Fake')",
        [requestId, trainee],
      ),
    ).rejects.toThrow(/permission denied/);
  });

  it("let trainees tick off items but not rewrite them", async () => {
    const { requestId, approved } = await releasedRequest();
    await db.as(trainee, "select public.grant_consent($1, 'ai_development_plan', 'v1')", [requestId]);
    const [plan] = await savePlan(trainee, requestId, [approved]);
    const [item] = await db.as<{ id: string }>(trainee, "select id from public.development_plan_items where plan_id = $1", [plan.id]);

    await db.as(otherTrainee, "update public.development_plan_items set completed_at = now() where id = $1", [item.id]);
    const [untouched] = await db.admin<{ completed_at: string | null }>("select completed_at from public.development_plan_items where id = $1", [item.id]);
    expect(untouched.completed_at).toBeNull();

    await db.as(trainee, "update public.development_plan_items set completed_at = now() where id = $1", [item.id]);
    const [done] = await db.admin<{ completed_at: string | null }>("select completed_at from public.development_plan_items where id = $1", [item.id]);
    expect(done.completed_at).not.toBeNull();

    await expect(
      db.as(trainee, "update public.development_plan_items set title = 'Changed' where id = $1", [item.id]),
    ).rejects.toThrow(/permission denied/);
  });
});

describe("scenario attempts", () => {
  it("belong to the trainee who made them", async () => {
    const [attempt] = await db.as<{ id: string }>(
      trainee,
      "insert into public.scenario_attempts (scenario_id, trainee_id) values ($1, $2) returning id",
      [scenarioId, trainee],
    );
    const sql = "select 1 from public.scenario_attempts where id = $1";
    expect(await db.as(trainee, sql, [attempt.id])).toHaveLength(1);
    expect(await db.as(otherTrainee, sql, [attempt.id])).toEqual([]);
    expect(await db.as(psych, sql, [attempt.id])).toEqual([]);
  });

  it("cannot be created for another trainee or by a psychologist", async () => {
    const sql = "insert into public.scenario_attempts (scenario_id, trainee_id) values ($1, $2)";
    await expect(db.as(otherTrainee, sql, [scenarioId, trainee])).rejects.toThrow(/row-level security/);
    await expect(db.as(psych, sql, [scenarioId, psych])).rejects.toThrow(/row-level security/);
  });

  it("lock once completed", async () => {
    const [attempt] = await db.as<{ id: string }>(
      trainee,
      "insert into public.scenario_attempts (scenario_id, trainee_id, completed_at) values ($1, $2, now()) returning id",
      [scenarioId, trainee],
    );
    await db.as(trainee, `update public.scenario_attempts set choices = '["changed"]' where id = $1`, [attempt.id]);
    const [row] = await db.admin<{ choices: unknown[] }>("select choices from public.scenario_attempts where id = $1", [attempt.id]);
    expect(row.choices).toEqual([]);
  });
});
