import type OpenAI from "openai";
import type {
  ChatCompletion,
  ChatCompletionCreateParams,
} from "openai/resources/chat/completions";
import { supportsTemperature } from "@/lib/ai/modelCapabilities";

export interface JsonSchemaFormat {
  name: string;
  strict: boolean;
  schema: Record<string, unknown>;
}

export interface BuildOpenAIRequestOptionsInput {
  model: string;
  messages: ChatCompletionCreateParams["messages"];
  jsonSchema: JsonSchemaFormat;
  /** Used only when {@link supportsTemperature} is true for this model. */
  temperaturePreference?: number;
  /**
   * Reserved for Responses API / future SDK fields.
   * Not sent on chat.completions today — omit temperature is the required fix.
   */
  reasoningEffort?: "low" | "medium" | "high";
  textVerbosity?: "low" | "medium" | "high";
}

const DEFAULT_TEMPERATURE = 0.5;

/**
 * Builds chat completion params, omitting temperature for GPT-5 family models.
 */
export function buildOpenAIRequestOptions(
  input: BuildOpenAIRequestOptionsInput
): ChatCompletionCreateParams {
  const { model, messages, jsonSchema, temperaturePreference = DEFAULT_TEMPERATURE } =
    input;

  const options: ChatCompletionCreateParams = {
    model,
    messages,
    response_format: {
      type: "json_schema",
      json_schema: jsonSchema,
    },
  };

  if (supportsTemperature(model)) {
    options.temperature = temperaturePreference;
  }

  void input.reasoningEffort;
  void input.textVerbosity;

  return options;
}

export async function createStructuredChatCompletion(
  openai: OpenAI,
  input: BuildOpenAIRequestOptionsInput
): Promise<ChatCompletion> {
  const params: ChatCompletionCreateParams = {
    ...buildOpenAIRequestOptions(input),
    stream: false,
  };
  assertRequestOptionsCompliance(input.model, params);
  return openai.chat.completions.create(
    params
  ) as Promise<ChatCompletion>;
}

/** Regression guard: GPT-5 models must not send temperature. */
export function assertRequestOptionsCompliance(
  model: string,
  options: ChatCompletionCreateParams
): void {
  if (!supportsTemperature(model) && options.temperature != null) {
    throw new Error(
      `OpenAI request for ${model} must not include temperature (got ${options.temperature})`
    );
  }
}

/** Run at harness startup to verify option builder behavior. */
export function assertGpt5RequestOptionsCompliance(): void {
  const premium = process.env.OPENAI_PREMIUM_MODEL ?? "gpt-5.5";
  const mini = process.env.OPENAI_MINI_BACKUP_MODEL ?? "gpt-5.4-mini";

  for (const model of [premium, mini, "gpt-5.5", "gpt-4o-mini"]) {
    const options = buildOpenAIRequestOptions({
      model,
      messages: [{ role: "user", content: "test" }],
      jsonSchema: { name: "test", strict: true, schema: { type: "object" } },
    });
    assertRequestOptionsCompliance(model, options);
  }

  const gpt5Options = buildOpenAIRequestOptions({
    model: "gpt-5.5",
    messages: [{ role: "user", content: "test" }],
    jsonSchema: { name: "test", strict: true, schema: { type: "object" } },
    temperaturePreference: 0.5,
  });

  if ("temperature" in gpt5Options && gpt5Options.temperature !== undefined) {
    throw new Error("gpt-5.5 request options must not include temperature");
  }

  const legacyOptions = buildOpenAIRequestOptions({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: "test" }],
    jsonSchema: { name: "test", strict: true, schema: { type: "object" } },
    temperaturePreference: 0.5,
  });

  if (legacyOptions.temperature !== 0.5) {
    throw new Error("gpt-4o-mini request options should include temperature 0.5");
  }
}
