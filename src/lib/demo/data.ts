import type { ScenarioContent } from "@/lib/schemas/scenario";

/** All data here is synthetic. Names and credentials are illustrative, not real people. */

export const DEMO_TRAINEE = {
  email: "demo.trainee@aeromind.example",
  displayName: "Sample Trainee",
};

export const DEMO_PSYCHOLOGIST_EMAIL = "demo.psychologist@aeromind.example";

type SampleProfessional = {
  email: string;
  displayName: string;
  headline: string;
  bio: string;
  qualifications: string[];
  specialties: string[];
  languages: string[];
  consultationFormats: string[];
  country: string;
  yearsExperience: number;
  acceptingRequests: boolean;
};

export const SAMPLE_PROFESSIONALS: SampleProfessional[] = [
  {
    email: DEMO_PSYCHOLOGIST_EMAIL,
    displayName: "Dr Elena Marsh (sample)",
    headline: "Sample aviation psychologist for student pilots",
    bio: "A fictional profile used to demonstrate AeroMind. Dr Marsh is presented as supporting student pilots with workload and decision-making under pressure.",
    qualifications: ["Illustrative: Doctorate in Psychology", "Illustrative: Aviation psychology training"],
    specialties: ["Workload management", "Decision-making", "Stress management"],
    languages: ["English", "German"],
    consultationFormats: ["Online"],
    country: "Germany",
    yearsExperience: 12,
    acceptingRequests: true,
  },
  {
    email: "sample.tomas@aeromind.example",
    displayName: "Tomas Lindqvist (sample)",
    headline: "Sample specialist in attention and situational awareness",
    bio: "A fictional profile used to demonstrate AeroMind's professional directory. It does not represent a real practitioner.",
    qualifications: ["Illustrative: MSc Psychology"],
    specialties: ["Situational awareness", "Attention management"],
    languages: ["English", "Swedish"],
    consultationFormats: ["Online", "In person"],
    country: "Sweden",
    yearsExperience: 8,
    acceptingRequests: false,
  },
  {
    email: "sample.ines@aeromind.example",
    displayName: "Dr Ines Carvalho (sample)",
    headline: "Sample consultant in communication and teamwork",
    bio: "A fictional profile used to demonstrate AeroMind's professional directory. It does not represent a real practitioner.",
    qualifications: ["Illustrative: Doctorate in Psychology"],
    specialties: ["Communication and teamwork", "Human factors"],
    languages: ["English", "Portuguese", "Spanish"],
    consultationFormats: ["Online"],
    country: "Portugal",
    yearsExperience: 15,
    acceptingRequests: false,
  },
  {
    email: "sample.niamh@aeromind.example",
    displayName: "Niamh Byrne (sample)",
    headline: "Sample practitioner in stress and emotional regulation",
    bio: "A fictional profile used to demonstrate AeroMind's professional directory. It does not represent a real practitioner.",
    qualifications: ["Illustrative: MSc Psychology"],
    specialties: ["Stress management", "Emotional regulation"],
    languages: ["English"],
    consultationFormats: ["Online", "In person"],
    country: "Ireland",
    yearsExperience: 6,
    acceptingRequests: false,
  },
];

export const WORKLOAD_SCENARIO: {
  slug: string;
  title: string;
  summary: string;
  content: ScenarioContent;
} = {
  slug: "busy-circuit-workload",
  title: "Busy circuit: managing workload",
  summary:
    "An illustrative solo circuit where several tasks arrive at once. Practise deciding what comes first. Always follow your instructor and flight school procedures.",
  content: {
    version: 1,
    startStepId: "downwind",
    steps: [
      {
        id: "downwind",
        situation:
          "You are flying a solo circuit at a busy aerodrome. On downwind, the tower asks you to extend because of traffic ahead. Your pre-landing checks are not finished and you have drifted slightly below circuit height.",
        choices: [
          {
            id: "fly-first",
            label: "Correct height and spacing first, then return to the checks",
            feedback:
              "Flying the aircraft comes first. Stabilising the aircraft creates the mental space to handle the next task, and the checks can resume once it is under control.",
            nextStepId: "readback",
          },
          {
            id: "finish-checks",
            label: "Finish the checks now while the aircraft holds its current path",
            feedback:
              "Checks matter, but heads-down work while height is drifting can let a small deviation grow. Consider what would happen if you were interrupted again mid-check.",
            nextStepId: "readback",
          },
          {
            id: "turn-base",
            label: "Turn base early so the tasks finish sooner",
            feedback:
              "Pressure to get the task over with is a common trap. Turning early would ignore the instruction and could conflict with the traffic ahead.",
            nextStepId: "readback",
          },
        ],
      },
      {
        id: "readback",
        situation:
          "The aircraft is stable, but you are not certain you heard the tower's full instruction. Other aircraft are calling on the frequency.",
        choices: [
          {
            id: "confirm",
            label: "At the next gap, ask the tower to confirm the instruction",
            feedback:
              "Clarifying is a sign of good airmanship, not weakness. A short, clear request is better than acting on an assumption.",
            nextStepId: "reflection",
          },
          {
            id: "assume",
            label: "Continue with what you think you heard",
            feedback:
              "Expectation can fill gaps in what we hear, especially under workload. An assumption that feels certain can still be wrong.",
            nextStepId: "reflection",
          },
        ],
      },
      {
        id: "reflection",
        situation:
          "You land safely and review the circuit. Which habit would help most next time tasks arrive together?",
        choices: [
          {
            id: "prioritise",
            label: "Pause, name the priorities, then work through them in order",
            feedback:
              "A simple priority order, such as aviate, navigate, communicate, gives you a routine to fall back on. Discuss with your instructor how it applies to your training.",
            nextStepId: null,
          },
          {
            id: "speed-up",
            label: "Try to do everything faster",
            feedback:
              "Speed helps less than sequence. Rushing tends to increase errors, so ordering tasks often does more than hurrying them.",
            nextStepId: null,
          },
        ],
      },
    ],
  },
};

export const DEMO_QUESTIONNAIRE_VERSION = "demo-v1";
export const DEMO_POLICY_VERSION = "prototype-v1";

export const DEMO_RESPONSES = {
  note: "Synthetic demonstration responses. This is not a validated psychological instrument.",
  answers: {
    "managing-competing-tasks": "somewhat-confident",
    "staying-calm-under-time-pressure": "confident",
    "making-decisions-under-pressure": "confident",
    "asking-for-clarification": "somewhat-confident",
    "noticing-changes": "confident",
  },
};

export const DEMO_RECOMMENDATION = {
  competency: "workload_management",
  recommendationText:
    "Sample recommendation: practise prioritising tasks when several demands arrive together, and review the approach with your instructor.",
  educationalSummary:
    "The learner would benefit from educational material on prioritising tasks during high-workload phases of flight training.",
};

export const DEMO_REPORT = {
  title: "Sample report: workload and prioritisation",
  body: "SAMPLE REPORT. This document is synthetic and is shown for demonstration only. It is not a psychological assessment, a medical opinion or a statement of fitness to fly.\n\nThe sample trainee completed a demonstration self-reflection questionnaire. In this fictional scenario, the professional suggests further learning on prioritising tasks during busy phases of flight training.",
};

export const DEMO_PLAN = {
  title: "Sample plan: prioritising under workload",
  summary:
    "A pre-generated sample plan showing how recommendations approved by a professional can become educational activities.",
  items: [
    {
      itemType: "objective",
      title: "Understand why task order matters",
      description: "Learn how a clear order of priorities supports decisions when demands compete.",
    },
    {
      itemType: "scenario",
      title: "Practise the busy circuit scenario",
      description: "Work through an illustrative circuit where several tasks arrive at once.",
    },
    {
      itemType: "reflection",
      title: "Reflect on a recent busy moment",
      description: "Note what you did first and what you would keep or change next time.",
    },
    {
      itemType: "follow_up",
      title: "Discuss progress with your professional",
      description: "Consider arranging a follow-up to talk through what you have learned.",
    },
  ],
};
