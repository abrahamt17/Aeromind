import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { applySchema } from "../../src/lib/db/bootstrap";
import { hashPassword, verifyPassword } from "../../src/lib/db/passwords";
import { seedDemoData } from "../../src/lib/db/seed";

let pg: PGlite;

beforeAll(async () => {
  pg = new PGlite();
  await applySchema(pg);
  await seedDemoData(pg);
});

afterAll(async () => {
  await pg.close();
});

async function count(table: string): Promise<number> {
  const { rows } = await pg.query<{ total: number }>(`select count(*)::int as total from ${table}`);
  return rows[0].total;
}

describe("demo data", () => {
  it("creates the labelled professionals and one complete journey", async () => {
    expect(await count("public.psychologist_profiles where published and is_sample")).toBe(4);
    expect(await count("public.assessment_requests where status = 'report_released'")).toBe(1);
    expect(await count("public.professional_reports where is_sample and released_at is not null")).toBe(1);
    expect(await count("public.development_plans where is_sample")).toBe(1);
    expect(await count("public.development_plan_items")).toBe(4);
    expect(await count("public.development_plan_items where scenario_id is not null")).toBe(1);
  });

  it("never marks a sample professional as genuinely verified", async () => {
    expect(await count("public.psychologist_profiles where verification_status = 'verified'")).toBe(0);
  });

  it("creates no admin accounts", async () => {
    expect(await count("public.profiles where role = 'admin'")).toBe(0);
  });
});

describe("passwords", () => {
  it("verifies only the original password", () => {
    const stored = hashPassword("a-long-test-password");

    expect(stored).not.toContain("a-long-test-password");
    expect(verifyPassword("a-long-test-password", stored)).toBe(true);
    expect(verifyPassword("wrong-password", stored)).toBe(false);
  });
});
