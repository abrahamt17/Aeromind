import type { LessonReference } from "@/lib/demo/academy";

/**
 * Lesson text and quizzes, keyed by lesson title. These are original drafts,
 * awaiting review by a qualified professional before being treated as authoritative.
 */

type QuizQuestion = {
  prompt: string;
  options: string[];
  /** Index of the correct option. */
  correct: number;
  explanation: string;
};

type LessonExtra = {
  content?: { objectives: string[]; body: string; references: LessonReference[] };
  quiz: QuizQuestion[];
};

const PHAK_CHAPTER_2: LessonReference = {
  title: "Pilot's Handbook of Aeronautical Knowledge, Chapter 2: Aeronautical Decision-Making",
  publisher: "Federal Aviation Administration",
  url: "https://www.faa.gov/regulationspolicies/handbooksmanuals/aviation/phak/chapter-2-aeronautical-decision-making",
};

const PHAK_CHAPTER_17: LessonReference = {
  title: "Pilot's Handbook of Aeronautical Knowledge, Chapter 17: Aeromedical Factors",
  publisher: "Federal Aviation Administration",
  url: "https://www.faa.gov/regulationspolicies/handbooksmanuals/aviation/phak/chapter-17-aeromedical-factors",
};

const INSTRUCTOR_HANDBOOK_CHAPTER_2: LessonReference = {
  title: "Aviation Instructor's Handbook, Chapter 2: Human Behavior",
  publisher: "Federal Aviation Administration",
  url: "https://www.faa.gov/sites/faa.gov/files/regulations_policies/handbooks_manuals/aviation/aviation_instructors_handbook/04_aih_chapter_2.pdf",
};

export const LESSON_EXTRAS: Record<string, LessonExtra> = {
  "What stress is": {
    quiz: [
      {
        prompt: "Which description of stress best matches this lesson?",
        options: [
          "A sign that someone is unsuitable for flying",
          "The body's response to the demands placed on it",
          "A problem that affects only inexperienced students",
        ],
        correct: 1,
        explanation: "Stress is a normal response to demands. It is not a sign of weakness or unsuitability.",
      },
      {
        prompt: "A student has been worrying about training costs for several months. Which term fits best?",
        options: ["Acute stress", "Chronic stress", "Environmental stress"],
        correct: 1,
        explanation: "Chronic stress builds over a longer period, when pressure continues without enough recovery.",
      },
    ],
  },
  "How stress affects attention and decisions": {
    content: {
      objectives: [
        "Explain how high stress can narrow attention",
        "Describe how decisions can change under pressure",
        "Identify one way to widen your attention again",
      ],
      body: `## Attention is limited

You can only attend to so much at once. When demands rise, attention tends to narrow towards whatever feels most urgent. That can be useful for a short time, but it also means other information may be missed.

## How decisions can change

Under pressure, people may simplify. They may consider fewer options, rely on the first idea that comes to mind or feel pushed to act quickly. These shortcuts are normal, but they can leave less room to notice that a situation has changed.

## An aviation example

A student on final is fixated on a warning light that has just come on. Their attention is on the panel, and they notice late that their speed has dropped. The light may have mattered, but flying the aircraft still came first.

## Widening your attention

A short, deliberate reset can help. Take one slow breath, look outside and return to your normal scan. Then ask two questions: what is the most important thing right now, and what might I be missing?

## What to take from this lesson

Narrowed attention is a normal effect of pressure, so plan for it rather than hoping to avoid it. This lesson is educational, not flight instruction. Always follow your instructor and flight school procedures.`,
      references: [PHAK_CHAPTER_2, PHAK_CHAPTER_17],
    },
    quiz: [
      {
        prompt: "What often happens to attention as demands rise?",
        options: [
          "It tends to narrow towards what feels most urgent",
          "It spreads evenly across every task",
          "It stops working completely",
        ],
        correct: 0,
        explanation: "Attention tends to narrow under pressure, so other information may be missed.",
      },
      {
        prompt: "Which action best matches the reset in this lesson?",
        options: [
          "Work faster through every task",
          "Keep looking at the problem until it is solved",
          "Take a slow breath, look outside and return to your scan",
        ],
        correct: 2,
        explanation: "A short deliberate reset helps you widen your attention and reconsider priorities.",
      },
    ],
  },
  "Noticing your early signs": {
    content: {
      objectives: [
        "Name physical, mental and behavioural signs of stress",
        "Identify your own early signs",
      ],
      body: `## Why early signs matter

Stress is easier to deal with when you notice it early. By the time you feel overwhelmed, your attention may already be narrow. Everyone's signs differ, so it helps to learn your own.

## Three kinds of sign

- **Physical:** a faster heartbeat, tense shoulders, sweating or a dry mouth.
- **Mental:** racing thoughts, trouble remembering a radio call or going over a mistake again and again.
- **Behavioural:** rushing, becoming quiet, snapping at others or skipping steps.

## An aviation example

A student notices that they are gripping the controls harder than usual and have stopped talking during the lesson. Neither is a problem by itself, but both are useful signals. Saying "I'm getting behind" gives the instructor a chance to help.

## Build your own list

After your next lesson, write down one physical, one mental and one behavioural sign you noticed. Over time, you will build a short personal list that you can check during training.

## What to take from this lesson

Noticing a sign is useful information, not a failure. This lesson is educational and does not assess your stress. If these signs are affecting your wellbeing, speak to your instructor or a qualified professional.`,
      references: [INSTRUCTOR_HANDBOOK_CHAPTER_2],
    },
    quiz: [
      {
        prompt: "Which of these is a behavioural sign of stress?",
        options: ["A dry mouth", "Rushing or skipping steps", "A faster heartbeat"],
        correct: 1,
        explanation: "Rushing and skipping steps are behaviours. A dry mouth and faster heartbeat are physical signs.",
      },
      {
        prompt: "Why does it help to notice signs early?",
        options: [
          "So you can prove that you are fit to fly",
          "So you can act before attention narrows further",
          "So you can avoid telling your instructor",
        ],
        correct: 1,
        explanation: "Early notice leaves you more options. Noticing signs never proves or disproves fitness to fly.",
      },
    ],
  },
  "Workload and busy phases of flight": {
    content: {
      objectives: [
        "Explain how workload and stress relate",
        "Use a simple priority order",
        "Plan ahead for a busy phase",
      ],
      body: `## Workload and stress often arrive together

Workload is the amount of work to be done in the time available. When tasks pile up, stress tends to rise, and stress can in turn make the same tasks feel harder.

## Getting ahead

Many busy moments can be predicted. The circuit, the approach and the arrival at an unfamiliar aerodrome all bring tasks together. Preparing during quieter moments leaves more capacity for when you need it.

## A simple priority order

The familiar order of aviate, navigate, communicate gives you a routine to fall back on:

- **Aviate:** control the aircraft first.
- **Navigate:** know where you are and where you are going.
- **Communicate:** tell others what they need to know.

## An aviation example

On downwind, a student is asked to extend while checks are unfinished and height is drifting. Correcting the aircraft first creates the mental space to return to the checks. You can practise exactly this in the scenario linked to this lesson.

## What to take from this lesson

Sequence often helps more than speed. Discuss with your instructor how these priorities apply to your training. This lesson is educational, not flight instruction.`,
      references: [PHAK_CHAPTER_2],
    },
    quiz: [
      {
        prompt: "In the priority order from this lesson, what comes first?",
        options: ["Communicate", "Navigate", "Aviate"],
        correct: 2,
        explanation: "Controlling the aircraft comes first. Navigation and communication follow.",
      },
      {
        prompt: "When is the best time to prepare for a busy phase of flight?",
        options: [
          "During a quieter moment before it begins",
          "Once all of the tasks have arrived",
          "After landing",
        ],
        correct: 0,
        explanation: "Preparing in quieter moments leaves more capacity when workload rises.",
      },
    ],
  },
  "Progress checks and exam pressure": {
    content: {
      objectives: [
        "Explain why assessed moments can feel different",
        "Prepare a simple routine for a progress check",
      ],
      body: `## Why being assessed feels different

A progress check can feel like a verdict on you rather than a review of your flying. That extra meaning adds to the demands you are carrying, even when the flying itself is familiar.

## Prepare the process, not only the outcome

You cannot fully control the result, but you can control how you prepare:

- Find out what will be covered, and ask if you are unsure.
- Rehearse the flow in a calm setting, such as chair flying.
- Plan sleep, food and travel for the day before.
- Decide on a short routine for the hour before the check.

## When something goes wrong

Mistakes happen on check flights too. The next task still needs your attention. Try to acknowledge the error, correct what you can and return to the flight in front of you. There will be time for review afterwards.

## An aviation example

A student makes a poor radio call early in a check and keeps replaying it in their mind. A short phrase such as "next task" can bring attention back to what matters now.

## What to take from this lesson

A progress check reviews your training on one day. This lesson is educational. It does not predict the result of any check or official assessment.`,
      references: [INSTRUCTOR_HANDBOOK_CHAPTER_2],
    },
    quiz: [
      {
        prompt: "What does this lesson suggest focusing your preparation on?",
        options: ["Guaranteeing the result", "The process you can control", "Comparing yourself with others"],
        correct: 1,
        explanation: "You cannot fully control a result, but you can control how you prepare.",
      },
      {
        prompt: "You make an error early in a progress check. What is the most helpful response?",
        options: [
          "Keep replaying it to work out what happened",
          "Acknowledge it, correct what you can and return to the next task",
          "Stop concentrating because the check is already lost",
        ],
        correct: 1,
        explanation: "Bringing attention back to the next task helps most. Reviewing can wait until afterwards.",
      },
    ],
  },
  "Life outside the aircraft": {
    content: {
      objectives: [
        "Explain how life outside training can affect it",
        "Decide what to do when other pressures are high",
      ],
      body: `## You bring your whole life to the airfield

Money, study, work, relationships and family all take up attention. They do not stay in the car park when you walk to the aircraft. A worry that seems manageable on the ground can still take up capacity when workload rises.

## Noticing the load you are carrying

Before a lesson, take a moment to ask what else is on your mind today. You do not have to solve it. Naming it helps you judge how much attention you really have available.

## Pressure to keep going

Flight training costs money and time, so cancelling a lesson can feel like a failure. That pressure is real, and it is worth noticing. A lesson flown while distracted may also cost you, in money and in confidence.

## An aviation example

After an argument at home, a student arrives for a lesson feeling unsettled. They tell their instructor they are not at their best, and together they decide how to approach the session. An honest conversation gives both of them better information.

## What to take from this lesson

Being honest about the load you are carrying is good airmanship. This lesson is educational. If pressures outside training are affecting your wellbeing, speak to someone you trust or a qualified professional.`,
      references: [PHAK_CHAPTER_17],
    },
    quiz: [
      {
        prompt: "Why might an everyday worry matter during a flight lesson?",
        options: [
          "It can take up attention when workload rises",
          "It automatically means you must stop training",
          "It has no effect once you are in the aircraft",
        ],
        correct: 0,
        explanation: "Worries take up capacity. That is useful to notice, but it does not decide anything automatically.",
      },
      {
        prompt: "Which response best fits this lesson?",
        options: [
          "Hide how you feel from your instructor",
          "Tell your instructor and decide together how to approach the session",
          "Fly faster to finish the lesson sooner",
        ],
        correct: 1,
        explanation: "An honest conversation gives you and your instructor better information.",
      },
    ],
  },
  "Personal checklists before you fly": {
    content: {
      objectives: [
        "Describe the purpose of a personal checklist",
        "Recall what the IMSAFE memory aid stands for",
      ],
      body: `## Checking the pilot as well as the aircraft

You would not fly without checking the aircraft. A personal checklist applies the same habit to yourself. It makes you pause and look honestly at how you are before you make a decision.

## The IMSAFE memory aid

IMSAFE is a widely used memory aid:

- **I: Illness.** Do I have any symptoms?
- **M: Medication.** Have I taken anything that could affect me?
- **S: Stress.** Am I under pressure from work, money, health or family?
- **A: Alcohol.** Have I been drinking recently?
- **F: Fatigue.** Am I well rested?
- **E: Emotion.** Am I emotionally settled?

## Using it well

A checklist only helps if you answer honestly. It does not make a decision for you, and it is not a medical or psychological test. If an answer concerns you, speak to your instructor. Questions about illness or medication should go to a qualified medical professional.

## An aviation example

A student slept badly and has a cold coming on. Working through IMSAFE before leaving home prompts them to call their instructor early, rather than deciding at the aircraft with pressure to go.

## What to take from this lesson

Make the check a routine, before you leave home if possible. This lesson is educational and does not determine fitness to fly. Always follow your flight school's procedures and applicable rules.`,
      references: [PHAK_CHAPTER_2, PHAK_CHAPTER_17],
    },
    quiz: [
      {
        prompt: "What does the S in IMSAFE stand for?",
        options: ["Sleep", "Stress", "Safety"],
        correct: 1,
        explanation: "IMSAFE stands for Illness, Medication, Stress, Alcohol, Fatigue and Emotion.",
      },
      {
        prompt: "What does completing a personal checklist tell you?",
        options: [
          "That you are officially fit to fly",
          "That you can skip the aircraft checks",
          "What to look at honestly, and whether to speak to someone",
        ],
        correct: 2,
        explanation: "A personal checklist supports your judgement. It is not a medical or psychological test.",
      },
    ],
  },
  "Recovery, sleep and routine": {
    content: {
      objectives: [
        "Explain why recovery belongs in a training plan",
        "Choose one recovery habit to try",
      ],
      body: `## Recovery is part of training

Learning needs time to settle. Long stretches of pressure without recovery make it harder to concentrate and to retain what you have practised. Rest is not time taken away from training. It supports it.

## Simple habits

Small, repeatable habits tend to last better than big changes:

- Keep regular sleep and wake times where you can.
- Eat and drink before a lesson, and take water to the airfield.
- Leave a buffer between work or study and flying.
- Build in some time each week that has nothing to do with aviation.

## An aviation example

A student books three early lessons after three late shifts, trying to catch up. A review with their instructor spaces the lessons out. Fewer sessions flown while rested may do more for their progress.

## What to take from this lesson

Choose one habit and try it for two weeks. Notice what changes. This lesson is educational. If sleep or stress problems continue, speak to a qualified professional.`,
      references: [PHAK_CHAPTER_17],
    },
    quiz: [
      {
        prompt: "How does this lesson describe rest?",
        options: ["Time taken away from training", "Something that supports learning", "Only needed after an exam"],
        correct: 1,
        explanation: "Learning needs time to settle, so recovery belongs in your training plan.",
      },
      {
        prompt: "Which approach to changing habits does this lesson suggest?",
        options: ["Change everything at once", "Wait for a quieter year", "Choose one small habit and try it"],
        correct: 2,
        explanation: "Small, repeatable habits tend to last better than big changes.",
      },
    ],
  },
  "When and how to ask for help": {
    content: {
      objectives: [
        "Recognise when to ask for support",
        "Prepare a simple way to start the conversation",
      ],
      body: `## Asking for help is part of good airmanship

Aviation depends on people speaking up early. The same is true of your own wellbeing. Asking for help is a practical step, not a sign that you are failing.

## When to ask

Consider talking to someone if:

- Stress continues for weeks, or keeps getting worse.
- Your sleep, appetite or mood are changing.
- You are avoiding lessons you used to look forward to.
- Worries are affecting your flying or your daily life.

## Who can help

- **Your instructor** can help with workload, pacing and training plans.
- **Someone you trust** can help you think things through.
- **A doctor or qualified psychologist** can help with your health and wellbeing.

## Starting the conversation

You do not need the perfect words. Something like this is enough: "I've been finding things harder lately. Can we talk about it?"

## If you feel unsafe

If you feel you might harm yourself or are in immediate danger, contact local emergency services straight away. In the EU, you can call 112.

## What to take from this lesson

You do not need to reach a crisis before you ask for support. AeroMind's lessons and AI tools are educational and cannot replace a qualified professional.`,
      references: [INSTRUCTOR_HANDBOOK_CHAPTER_2],
    },
    quiz: [
      {
        prompt: "When does this lesson suggest speaking to someone?",
        options: [
          "Only when you reach a crisis",
          "When stress continues or starts to affect daily life",
          "Only after a failed progress check",
        ],
        correct: 1,
        explanation: "You do not need to reach a crisis. Earlier support is more useful.",
      },
      {
        prompt: "Who is best placed to help with concerns about your health or wellbeing?",
        options: ["A doctor or qualified psychologist", "A quiz in a learning app", "An AI tutor"],
        correct: 0,
        explanation: "Qualified professionals can help with health and wellbeing. Learning tools cannot replace them.",
      },
    ],
  },
  "Why decisions can be trained": {
    quiz: [
      {
        prompt: "Which thought matches the invulnerability attitude?",
        options: ["It won't happen to me", "Do it quickly", "What's the use?"],
        correct: 0,
        explanation: "Invulnerability is the belief that accidents happen to other people.",
      },
      {
        prompt: "What is the point of learning about hazardous attitudes?",
        options: [
          "To label yourself or other pilots",
          "To notice the thought behind a decision",
          "To measure your psychological fitness",
        ],
        correct: 1,
        explanation: "Everyone can show these attitudes. Noticing them gives you a chance to think again.",
      },
    ],
  },
  "Fatigue in plain language": {
    quiz: [
      {
        prompt: "Why is planning for rest better than judging how you feel on the day?",
        options: [
          "Tired people are often poor judges of how tired they are",
          "Fatigue never affects performance",
          "Coffee removes the effects of fatigue",
        ],
        correct: 0,
        explanation: "You may feel fine while your performance has already dropped.",
      },
    ],
  },
  "What a cognitive bias is": {
    quiz: [
      {
        prompt: "What is confirmation bias?",
        options: [
          "Checking every source equally",
          "Favouring information that supports what you already believe",
          "Asking a tower to confirm an instruction",
        ],
        correct: 1,
        explanation: "Confirmation bias means noticing supporting information and passing over the rest.",
      },
    ],
  },
};
