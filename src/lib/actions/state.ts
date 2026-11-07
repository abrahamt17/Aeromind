export type ActionState = {
  status: "idle" | "error" | "success";
  message?: string;
  fieldErrors?: Partial<Record<string, string[]>>;
  /** Refills a form after an error, because React resets it. Never include passwords. */
  values?: Record<string, string>;
};

export const initialActionState: ActionState = { status: "idle" };
