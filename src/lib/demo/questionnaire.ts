/** A demonstration only. This is not a validated psychological instrument. */
export const QUESTIONNAIRE_OPTIONS = [
  { value: "not-confident", label: "Not confident" },
  { value: "somewhat-confident", label: "Somewhat confident" },
  { value: "confident", label: "Confident" },
  { value: "very-confident", label: "Very confident" },
] as const;

export const QUESTIONNAIRE_QUESTIONS = [
  { id: "managing-competing-tasks", text: "Managing several tasks that compete for your attention" },
  { id: "staying-calm-under-time-pressure", text: "Staying calm when time is short" },
  { id: "making-decisions-under-pressure", text: "Making a decision when you do not have all the information" },
  { id: "asking-for-clarification", text: "Asking for clarification when you are unsure" },
  { id: "noticing-changes", text: "Noticing when a situation is changing around you" },
] as const;

export function optionLabel(value: unknown): string {
  return QUESTIONNAIRE_OPTIONS.find((option) => option.value === value)?.label ?? "Not answered";
}
