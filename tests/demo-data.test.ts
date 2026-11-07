import { describe, expect, it } from "vitest";
import {
  DEMO_PLAN,
  DEMO_REPORT,
  SAMPLE_PROFESSIONALS,
  WORKLOAD_SCENARIO,
} from "../src/lib/demo/data";
import { scenarioContentSchema } from "../src/lib/schemas/scenario";

describe("demo data", () => {
  it("has a valid scenario whose steps all connect", () => {
    expect(scenarioContentSchema.safeParse(WORKLOAD_SCENARIO.content).success).toBe(true);
  });

  it("rejects a scenario that points at a missing step", () => {
    const broken = structuredClone(WORKLOAD_SCENARIO.content);
    broken.steps[0].choices[0].nextStepId = "missing";
    expect(scenarioContentSchema.safeParse(broken).success).toBe(false);
  });

  it("labels every professional and report as a sample", () => {
    for (const professional of SAMPLE_PROFESSIONALS) {
      expect(professional.displayName).toContain("(sample)");
      expect(professional.bio.toLowerCase()).toContain("fictional");
    }
    expect(DEMO_REPORT.title.toLowerCase()).toContain("sample");
    expect(DEMO_REPORT.body).toContain("SAMPLE REPORT");
    expect(DEMO_PLAN.title.toLowerCase()).toContain("sample");
  });

  it("uses reserved example addresses only", () => {
    for (const professional of SAMPLE_PROFESSIONALS) {
      expect(professional.email.endsWith(".example")).toBe(true);
    }
  });

  it("has one account that can accept live demo requests", () => {
    expect(SAMPLE_PROFESSIONALS.filter((p) => p.acceptingRequests)).toHaveLength(1);
  });
});
