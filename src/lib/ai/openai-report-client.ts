import OpenAI from "openai";
import {
  getReportModelOrder,
} from "@/lib/ai/selectReportModel";

export function getOpenAIClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not configured");
  return new OpenAI({ apiKey });
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

export class OpenAiModelOrderExhaustedError extends Error {
  readonly fallbackModelAttempted = true;
  readonly premiumModelFailed = true;
  readonly miniBackupModelFailed = true;

  constructor(
    readonly premiumModelFailedError: string,
    readonly miniBackupModelFailedError: string
  ) {
    super("OpenAI premium and mini backup models both failed");
    this.name = "OpenAiModelOrderExhaustedError";
  }
}

export type OpenAiModelOrderSuccess<T> = {
  report: T;
  source: "openai";
  model: string;
  fallbackModelAttempted: boolean;
  premiumModelFailed: boolean;
  miniBackupModelFailed: boolean;
  premiumModelFailedError?: string;
  miniBackupModelFailedError?: string;
};

function shouldLogModelDetails(): boolean {
  return (
    process.env.NODE_ENV === "development" || process.env.AI_TEST === "1"
  );
}

export function logModelOrderAttempt(options: {
  leadType: "buyer" | "seller" | "equity" | "wealth_forecast";
  premiumModel: string;
  miniBackupModel: string;
  modelSelectedFirst: string;
  modelSucceeded?: string;
  premiumModelFailed?: boolean;
  miniBackupAttempted?: boolean;
  premiumModelFailedError?: string;
  miniBackupModelFailedError?: string;
}): void {
  if (!shouldLogModelDetails()) return;

  console.log(`[report:${options.leadType}] model-order`, {
    premiumModel: options.premiumModel,
    miniBackupModel: options.miniBackupModel,
    modelSelectedFirst: options.modelSelectedFirst,
    modelSucceeded: options.modelSucceeded,
    premiumModelFailed: options.premiumModelFailed ?? false,
    miniBackupAttempted: options.miniBackupAttempted ?? false,
    premiumError: options.premiumModelFailedError,
    miniError: options.miniBackupModelFailedError,
  });
}

export async function generateOpenAiReportWithModelOrder<T>(options: {
  leadType: "buyer" | "seller" | "equity" | "wealth_forecast";
  callModel: (model: string) => Promise<T>;
}): Promise<OpenAiModelOrderSuccess<T>> {
  const [premiumModel, miniBackupModel] = getReportModelOrder();

  logModelOrderAttempt({
    leadType: options.leadType,
    premiumModel,
    miniBackupModel,
    modelSelectedFirst: premiumModel,
  });

  let premiumModelFailedError: string | undefined;

  try {
    const report = await options.callModel(premiumModel);
    logModelOrderAttempt({
      leadType: options.leadType,
      premiumModel,
      miniBackupModel,
      modelSelectedFirst: premiumModel,
      modelSucceeded: premiumModel,
      premiumModelFailed: false,
      miniBackupAttempted: false,
    });
    return {
      report,
      source: "openai",
      model: premiumModel,
      fallbackModelAttempted: false,
      premiumModelFailed: false,
      miniBackupModelFailed: false,
    };
  } catch (error) {
    premiumModelFailedError = getErrorMessage(error);
    logModelOrderAttempt({
      leadType: options.leadType,
      premiumModel,
      miniBackupModel,
      modelSelectedFirst: premiumModel,
      premiumModelFailed: true,
      miniBackupAttempted: true,
      premiumModelFailedError,
    });
  }

  try {
    const report = await options.callModel(miniBackupModel);
    logModelOrderAttempt({
      leadType: options.leadType,
      premiumModel,
      miniBackupModel,
      modelSelectedFirst: premiumModel,
      modelSucceeded: miniBackupModel,
      premiumModelFailed: true,
      miniBackupAttempted: true,
      premiumModelFailedError,
    });
    return {
      report,
      source: "openai",
      model: miniBackupModel,
      fallbackModelAttempted: true,
      premiumModelFailed: true,
      miniBackupModelFailed: false,
      premiumModelFailedError,
    };
  } catch (error) {
    const miniBackupModelFailedError = getErrorMessage(error);
    logModelOrderAttempt({
      leadType: options.leadType,
      premiumModel,
      miniBackupModel,
      modelSelectedFirst: premiumModel,
      premiumModelFailed: true,
      miniBackupAttempted: true,
      premiumModelFailedError,
      miniBackupModelFailedError,
    });
    throw new OpenAiModelOrderExhaustedError(
      premiumModelFailedError ?? "Premium model failed",
      miniBackupModelFailedError
    );
  }
}

export function getDeterministicFallbackMeta(error: unknown): {
  fallbackModelAttempted: boolean;
  premiumModelFailed: boolean;
  miniBackupModelFailed: boolean;
  premiumModelFailedError?: string;
  miniBackupModelFailedError?: string;
  error: string;
} {
  if (error instanceof OpenAiModelOrderExhaustedError) {
    return {
      fallbackModelAttempted: true,
      premiumModelFailed: true,
      miniBackupModelFailed: true,
      premiumModelFailedError: error.premiumModelFailedError,
      miniBackupModelFailedError: error.miniBackupModelFailedError,
      error: error.miniBackupModelFailedError,
    };
  }

  const message = getErrorMessage(error);
  return {
    fallbackModelAttempted: true,
    premiumModelFailed: true,
    miniBackupModelFailed: true,
    error: message,
  };
}
