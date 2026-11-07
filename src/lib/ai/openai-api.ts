/** Direct OpenAI calls. No app imports, so the indexing command can use this file too. */

export const EMBEDDING_DIMENSIONS = 1536;
export const DEFAULT_EMBEDDING_MODEL = "text-embedding-3-small";

export type AiFailure = "rate_limited" | "unavailable" | "refused";

export class AiProviderError extends Error {
  failure: AiFailure;

  constructor(failure: AiFailure, message: string) {
    super(message);
    this.name = "AiProviderError";
    this.failure = failure;
  }
}

function failureFor(status: number): AiProviderError {
  // The response body is not included, so nothing sensitive reaches the logs.
  if (status === 429) return new AiProviderError("rate_limited", "AI provider rate limit reached");
  return new AiProviderError("unavailable", `AI provider returned ${status}`);
}

async function post(apiKey: string, path: string, body: unknown, timeoutMs: number): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(`https://api.openai.com/v1/${path}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch {
    throw new AiProviderError("unavailable", "Could not reach the AI provider");
  }

  if (!response.ok) throw failureFor(response.status);
  return response.json();
}

export async function createEmbeddings(apiKey: string, model: string, texts: string[]): Promise<number[][]> {
  const body = (await post(
    apiKey,
    "embeddings",
    { model, input: texts, dimensions: EMBEDDING_DIMENSIONS },
    30_000,
  )) as { data?: { index: number; embedding: number[] }[] };

  const data = [...(body.data ?? [])].sort((a, b) => a.index - b.index);
  if (data.length !== texts.length) throw new AiProviderError("unavailable", "AI provider returned no embeddings");
  return data.map((item) => item.embedding);
}

type ResponsesBody = {
  status?: string;
  output?: { content?: { type?: string; text?: string }[] }[];
};

export async function createJsonResponse(
  apiKey: string,
  model: string,
  input: {
    system: string;
    user: string;
    schemaName: string;
    schema: Record<string, unknown>;
    maxOutputTokens: number;
    timeoutMs: number;
  },
): Promise<unknown> {
  const body = (await post(
    apiKey,
    "responses",
    {
      model,
      store: false,
      max_output_tokens: input.maxOutputTokens,
      input: [
        { role: "system", content: input.system },
        { role: "user", content: input.user },
      ],
      text: {
        format: { type: "json_schema", name: input.schemaName, strict: true, schema: input.schema },
      },
    },
    input.timeoutMs,
  )) as ResponsesBody;

  const parts = body.output?.flatMap((entry) => entry.content ?? []) ?? [];
  if (parts.some((part) => part.type === "refusal")) {
    throw new AiProviderError("refused", "AI provider declined the request");
  }

  const text = parts.find((part) => part.type === "output_text")?.text;
  if (!text || body.status === "incomplete") {
    throw new AiProviderError("unavailable", "AI provider returned an incomplete answer");
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new AiProviderError("unavailable", "AI provider returned invalid JSON");
  }
}
