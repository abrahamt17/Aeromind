export const COMPETENCIES = {
  stress_management: "Stress management",
  decision_making: "Decision-making under pressure",
  attention_management: "Attention management",
  situational_awareness: "Situational awareness",
  emotional_regulation: "Emotional regulation",
  communication_teamwork: "Communication and teamwork",
  workload_management: "Workload management",
  human_factors: "Aviation human factors",
} as const;

export type Competency = keyof typeof COMPETENCIES;

export const TRAINING_STAGES = {
  considering_career: "Considering a pilot career",
  preparing_for_flight_school: "Preparing for flight school",
  in_flight_training: "In flight training",
} as const;

export type TrainingStage = keyof typeof TRAINING_STAGES;

export const ASSESSMENT_STATUSES = {
  requested: "Awaiting response",
  accepted: "Questionnaire open",
  declined: "Declined",
  cancelled: "Cancelled",
  questionnaire_submitted: "Questionnaire submitted",
  in_review: "In review",
  report_released: "Report released",
} as const;

export type AssessmentStatus = keyof typeof ASSESSMENT_STATUSES;

export const VERIFICATION_LABELS = {
  unverified: "Not verified",
  demo_verified: "Demo verification",
  verified: "Verified",
} as const;

export type VerificationStatus = keyof typeof VERIFICATION_LABELS;

export const PLAN_ITEM_LABELS = {
  objective: "Learning objective",
  activity: "Activity",
  reflection: "Reflection",
  scenario: "Scenario",
  follow_up: "Professional follow-up",
} as const;

export type PlanItemType = keyof typeof PLAN_ITEM_LABELS;

export function formatDate(value: Date | string): string {
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" }).format(new Date(value));
}
