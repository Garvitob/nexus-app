import OpenAI from "openai";
import { AI_MODELS } from "@/lib/constants";

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

export const MODEL_STRONG = AI_MODELS.STRONG;
export const MODEL_LITE = AI_MODELS.LITE;
export const MODEL_EMBEDDING = AI_MODELS.EMBEDDING;

type JsonResult<T> = { ok: true; data: T } | { ok: false; error: string };

export async function completeJSON<T>(params: {
  model: string;
  system: string;
  user: string;
  maxTokens?: number;
}): Promise<JsonResult<T>> {
  try {
    const res = await openai.chat.completions.create({
      model: params.model,
      messages: [
        { role: "system", content: params.system },
        { role: "user", content: params.user },
      ],
      response_format: { type: "json_object" },
      max_completion_tokens: params.maxTokens ?? 800,
    });

    const raw = res.choices[0]?.message?.content;
    if (!raw) return { ok: false, error: "empty response" };

    const parsed = JSON.parse(raw) as T;
    return { ok: true, data: parsed };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "completion failed",
    };
  }
}

export async function completeText(params: {
  model: string;
  system: string;
  user: string;
  maxTokens?: number;
}): Promise<string | null> {
  try {
    const res = await openai.chat.completions.create({
      model: params.model,
      messages: [
        { role: "system", content: params.system },
        { role: "user", content: params.user },
      ],
      max_completion_tokens: params.maxTokens ?? 1000,
    });
    return res.choices[0]?.message?.content ?? null;
  } catch {
    return null;
  }
}

export async function embed(text: string): Promise<number[] | null> {
  try {
    const res = await openai.embeddings.create({
      model: MODEL_EMBEDDING,
      input: text.slice(0, 8000),
    });
    return res.data[0]?.embedding ?? null;
  } catch {
    return null;
  }
}