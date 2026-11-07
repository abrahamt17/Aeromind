import "server-only";
import {
  createEmbeddings,
  createJsonResponse,
  DEFAULT_EMBEDDING_MODEL,
} from "@/lib/ai/openai-api";

/** Everything the app needs from an AI provider. Add a new provider here only. */
export type AiProvider = {
  name: string;
  chatModel: string;
  embeddingModel: string;
  generateJson(input: {
    system: string;
    user: string;
    schemaName: string;
    schema: Record<string, unknown>;
    maxOutputTokens: number;
    timeoutMs: number;
  }): Promise<unknown>;
  embed(texts: string[]): Promise<number[][]>;
};

function createOpenAIProvider(apiKey: string, chatModel: string, embeddingModel: string): AiProvider {
  return {
    name: "openai",
    chatModel,
    embeddingModel,
    generateJson: (input) => createJsonResponse(apiKey, chatModel, input),
    embed: (texts) => createEmbeddings(apiKey, embeddingModel, texts),
  };
}

/** The one place that chooses a provider. Returns null when none is configured. */
export function getAiProvider(): AiProvider | null {
  const provider = process.env.AI_PROVIDER?.trim() || "openai";
  if (provider !== "openai") return null;

  const apiKey = process.env.OPENAI_API_KEY?.trim();
  const chatModel = process.env.AI_CHAT_MODEL?.trim() || process.env.OPENAI_MODEL?.trim();
  if (!apiKey || !chatModel) return null;

  const embeddingModel = process.env.AI_EMBEDDING_MODEL?.trim() || DEFAULT_EMBEDDING_MODEL;
  return createOpenAIProvider(apiKey, chatModel, embeddingModel);
}
