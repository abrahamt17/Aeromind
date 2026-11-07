import { z } from "zod";
import type { ActionState } from "@/lib/actions/state";

// Messages raised by the workflow functions are written for users.
const SAFE_DATABASE_CODES = new Set(["P0001", "42501", "28000"]);

export function errorState(error: unknown, values?: Record<string, string>): ActionState {
  const code = (error as { code?: string }).code;

  if (code === "23505") {
    return { status: "error", message: "This already exists, so nothing was changed.", values };
  }
  if (code && SAFE_DATABASE_CODES.has(code) && error instanceof Error) {
    return { status: "error", message: error.message, values };
  }

  console.error(error);
  return { status: "error", message: "Something went wrong. Please try again.", values };
}

export function invalidState(error: z.ZodError, values?: Record<string, string>): ActionState {
  return {
    status: "error",
    message: "Check the highlighted fields.",
    fieldErrors: z.flattenError(error).fieldErrors,
    values,
  };
}
