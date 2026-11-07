import { describe, expect, it } from "vitest";
import { DEMO_COURSES, DEMO_INSTRUCTORS, DEMO_RESOURCES } from "../src/lib/demo/academy";
import { LESSON_EXTRAS } from "../src/lib/demo/academy-lessons";
import { WORKLOAD_SCENARIO, WORKLOAD_SCENARIO_LESSON } from "../src/lib/demo/data";

const lessons = DEMO_COURSES.flatMap((course) => course.modules.flatMap((module) => module.lessons));
const bodies = lessons.flatMap((lesson) => {
  const body = lesson.content?.body ?? LESSON_EXTRAS[lesson.title]?.content?.body;
  return body ? [body] : [];
});

describe("Academy demo content", () => {
  it("labels every instructor and expert course as a demonstration", () => {
    for (const instructor of DEMO_INSTRUCTORS) {
      expect(instructor.displayName).toContain("(sample)");
      expect(instructor.bio.toLowerCase()).toContain("fictional");
      expect(instructor.qualifications.every((item) => item.startsWith("Illustrative"))).toBe(true);
    }
    for (const course of DEMO_COURSES.filter((item) => item.kind === "expert")) {
      expect(course.description.toLowerCase()).toContain("demonstration");
    }
  });

  it("gives lessons unique titles, because content is matched by title", () => {
    expect(new Set(lessons.map((lesson) => lesson.title)).size).toBe(lessons.length);
  });

  it("matches every extra to a lesson", () => {
    const titles = new Set(lessons.map((lesson) => lesson.title));
    for (const title of Object.keys(LESSON_EXTRAS)) expect(titles).toContain(title);
    expect(titles).toContain(WORKLOAD_SCENARIO_LESSON);
  });

  it("has valid quiz answers", () => {
    for (const { quiz } of Object.values(LESSON_EXTRAS)) {
      for (const question of quiz) {
        expect(question.options[question.correct]).toBeDefined();
        expect(new Set(question.options).size).toBe(question.options.length);
      }
    }
  });

  it("makes no unchecked market claims", () => {
    const copy = [
      ...DEMO_COURSES.flatMap((course) => [course.summary, course.description]),
      ...bodies,
    ].join("\n");
    expect(copy).not.toMatch(
      /\b(the (first|only) (platform|app|marketplace|service|product)|unique|guarantee[sd]?|best in)\b/i,
    );
  });

  it("never promises fitness, certification or an assessment result", () => {
    const copy = [...bodies, WORKLOAD_SCENARIO.summary].join("\n");
    expect(copy).not.toMatch(/you are fit to fly|proves? (your )?fitness|will pass|certifies/i);
  });

  it("links only to https sources and grants nothing for link-only resources", () => {
    for (const resource of DEMO_RESOURCES) {
      expect(resource.sourceUrl.startsWith("https://")).toBe(true);
      expect(resource.licence).toBe("link_only");
    }
  });

  it("identifies the scenario as an educational simulation", () => {
    expect(WORKLOAD_SCENARIO.content.context).toContain("educational simulation");
    expect(WORKLOAD_SCENARIO.content.reflection).toBeTruthy();
  });
});
