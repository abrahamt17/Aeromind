import { describe, expect, it, vi } from "vitest";
import { chunkText, MAX_CHUNK_CHARACTERS } from "../src/lib/ai/chunking";
import { AiProviderError } from "../src/lib/ai/openai-api";
import { extractPdfText } from "../src/lib/ai/pdf";
import {
  answerLearningQuestion,
  classifyQuestion,
  DISTRESS_RESPONSE,
  redactPersonalDetails,
  type TutorContext,
  type TutorDependencies,
} from "../src/lib/ai/tutor";

const context: TutorContext = {
  courseTitle: "Stress Management in Aviation",
  lessonTitle: "What stress is",
  objectives: ["Describe stress"],
  lessonBody: "Stress is the body's response to demands.",
  outline: [{ id: "lesson-2", title: "Noticing your early signs" }],
  lessonsToReview: [],
  history: [],
};

const chunk = {
  content: "Acute stress is short term.",
  lesson_id: "lesson-1",
  title: "What stress is",
  source_name: "Stress Management in Aviation",
  source_url: null,
};

function dependencies(reply: unknown): TutorDependencies & { generate: ReturnType<typeof vi.fn> } {
  return {
    embed: async () => [0.1],
    retrieve: async () => [chunk],
    generate: vi.fn(async () => reply),
  };
}

const goodReply = {
  answer: "Acute stress is a short-term reaction.",
  source_numbers: [1],
  suggested_lesson_titles: ["Noticing your early signs"],
};

describe("question classification", () => {
  it.each([
    "I want to kill myself",
    "i don't want to be alive any more",
    "I've been thinking about suicide",
    "I keep wanting to hurt myself",
  ])("treats %j as distress", (question) => {
    expect(classifyQuestion(question)).toBe("distress");
  });

  it.each(["Am I fit to fly?", "will i pass my medical", "Do I have anxiety?", "please diagnose me"])(
    "refuses to decide %j",
    (question) => {
      expect(classifyQuestion(question)).toBe("boundary");
    },
  );

  it.each([
    "How does acute stress affect decision-making?",
    "What does fitness to fly mean in general?",
    "Explain this more simply",
    "Why do pilots use checklists when stressed?",
  ])("lets %j through as a learning question", (question) => {
    expect(classifyQuestion(question)).toBe("learning");
  });

  it("gives a distress reply with emergency guidance and no AI", () => {
    expect(DISTRESS_RESPONSE).toContain("112");
    expect(DISTRESS_RESPONSE).toContain("wasn't sent to an AI provider");
  });
});

describe("personal details", () => {
  it("removes emails and phone numbers before anything is sent", () => {
    const redacted = redactPersonalDetails("I'm sam.lee+1@example.com, call +49 170 1234567 about attention");
    expect(redacted).not.toContain("example.com");
    expect(redacted).not.toContain("1234567");
    expect(redacted).toContain("about attention");
  });
});

describe("answering", () => {
  it("cites only sources that were really retrieved", async () => {
    const result = await answerLearningQuestion(
      "What is acute stress?",
      "beginner",
      context,
      dependencies({ ...goodReply, source_numbers: [1, 9, -1] }),
    );

    expect(result.status === "answered" && result.sources.map((source) => source.title)).toEqual(["What stress is"]);
  });

  it("ignores suggested lessons outside the course outline", async () => {
    const result = await answerLearningQuestion(
      "Help",
      "beginner",
      context,
      dependencies({ ...goodReply, suggested_lesson_titles: ["Noticing your early signs", "Invented lesson"] }),
    );

    expect(result.status === "answered" && result.suggestedLessons).toEqual(context.outline);
  });

  it("sends the lesson, question and level, and nothing identifying", async () => {
    const deps = dependencies(goodReply);
    await answerLearningQuestion("What is acute stress?", "advanced", context, deps);

    const sent = JSON.parse(deps.generate.mock.calls[0][0].user);
    expect(Object.keys(sent).sort()).toEqual(
      [
        "course",
        "learning_objectives",
        "lesson",
        "lesson_outline",
        "lesson_text",
        "lessons_to_review",
        "level",
        "question",
        "recent_conversation",
        "sources",
      ].sort(),
    );
    expect(sent.level).toBe("advanced");
    expect(sent.sources[0]).toEqual({ number: 1, title: chunk.title, text: chunk.content });
  });

  it.each([
    "Based on this, you are fit to fly.",
    "Don't worry, you will pass your check.",
    "It sounds like you have anxiety.",
  ])("never shows a prohibited claim: %j", async (answer) => {
    const result = await answerLearningQuestion("Help", "beginner", context, dependencies({ ...goodReply, answer }));
    expect(result.status).toBe("failed");
  });

  it("allows teaching about these topics", async () => {
    const answer = "Fitness to fly decisions are made by qualified medical examiners, not by this course.";
    const result = await answerLearningQuestion("Help", "beginner", context, dependencies({ ...goodReply, answer }));
    expect(result.status).toBe("answered");
  });

  it("never shows a malformed reply", async () => {
    const result = await answerLearningQuestion("Help", "beginner", context, dependencies({ text: "wrong shape" }));
    expect(result.status).toBe("failed");
  });

  it("explains provider failures clearly", async () => {
    for (const [failure, expected] of [
      ["rate_limited", "busy"],
      ["unavailable", "unavailable"],
    ] as const) {
      const deps = dependencies(goodReply);
      deps.generate.mockRejectedValueOnce(new AiProviderError(failure, "failed"));
      const result = await answerLearningQuestion("Help", "beginner", context, deps);
      expect(result.status === "failed" && result.message).toContain(expected);
    }
  });
});

describe("chunking", () => {
  it("keeps headings with their text", () => {
    const chunks = chunkText("Lesson", "## First\n\nOne.\n\n## Second\n\nTwo.");
    expect(chunks).toEqual(["Lesson: First\n\nOne.", "Lesson: Second\n\nTwo."]);
  });

  it("splits long text within the size limit, and loses nothing", () => {
    const sentence = "Pilots manage workload by planning ahead. ";
    const text = sentence.repeat(200).trim();
    const chunks = chunkText("Lesson", text);

    expect(chunks.length).toBeGreaterThan(1);
    for (const chunk of chunks) expect(chunk.length).toBeLessThanOrEqual(MAX_CHUNK_CHARACTERS + 20);
    const total = chunks.join(" ").match(/planning ahead/g)?.length;
    expect(total).toBe(200);
  });
});

describe("PDF reading", () => {
  it("extracts text from a PDF", async () => {
    const stream = "BT /F1 12 Tf 72 720 Td (Stress and workload in training) Tj ET";
    const pdf = `%PDF-1.4
1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj
2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj
3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>endobj
4 0 obj<</Length ${stream.length}>>stream
${stream}
endstream endobj
5 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj
trailer<</Root 1 0 R>>
%%EOF`;

    expect(await extractPdfText(new TextEncoder().encode(pdf))).toContain("Stress and workload");
  });
});
