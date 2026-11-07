/**
 * Demonstration Academy content. Instructors are fictional. Lessons are original
 * drafts that have not been professionally reviewed, and every course says so.
 */

export type LessonReference = { title: string; publisher: string; url: string };

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

const EASA_FATIGUE: LessonReference = {
  title: "Fatigue Risk Management",
  publisher: "European Union Aviation Safety Agency",
  url: "https://www.easa.europa.eu/en/node/143314",
};

type DemoInstructor = {
  slug: string;
  displayName: string;
  title: string;
  bio: string;
  experience: string;
  qualifications: string[];
  expertise: string[];
};

export const DEMO_INSTRUCTORS: DemoInstructor[] = [
  {
    slug: "ines-varga-sample",
    displayName: "Dr Ines Varga (sample)",
    title: "Sample instructor in human performance",
    bio: "A fictional profile used to demonstrate AeroMind Academy. Dr Varga is presented as teaching student pilots how fatigue and sleep affect performance. This person does not exist.",
    experience: "Illustrative only: presented as teaching human performance to flight students.",
    qualifications: ["Illustrative: Doctorate in Psychology", "Illustrative: Human factors training"],
    expertise: ["Fatigue", "Sleep", "Human performance"],
  },
  {
    slug: "marek-holt-sample",
    displayName: "Marek Holt (sample)",
    title: "Sample instructor in decision-making",
    bio: "A fictional profile used to demonstrate AeroMind Academy. Marek Holt is presented as teaching how cognitive biases shape decisions. This person does not exist.",
    experience: "Illustrative only: presented as teaching decision-making to flight students.",
    qualifications: ["Illustrative: MSc Psychology"],
    expertise: ["Cognitive biases", "Decision-making"],
  },
];

type DemoLesson = {
  title: string;
  summary: string;
  durationMinutes: number;
  /** Open to everyone. Written lessons without this flag need enrolment. */
  isPreview?: boolean;
  content?: {
    objectives: string[];
    body: string;
    references: LessonReference[];
  };
};

type DemoCourse = {
  slug: string;
  kind: "aeromind_original" | "expert";
  instructorSlug: string | null;
  title: string;
  summary: string;
  description: string;
  category: string;
  competencies: string[];
  level: "beginner" | "intermediate" | "advanced";
  audience: string;
  objectives: string[];
  featured: boolean;
  modules: { title: string; summary: string; lessons: DemoLesson[] }[];
};

export const DEMO_COURSES: DemoCourse[] = [
  {
    slug: "stress-management-in-aviation",
    kind: "aeromind_original",
    instructorSlug: null,
    title: "Stress Management in Aviation",
    summary: "Understand how stress affects attention and decisions in training, and build simple habits for busy moments.",
    description:
      "Stress is a normal part of learning to fly. This course explains what stress is, how it can change attention and decision-making, and which practical habits help you stay organised. It is educational and does not assess or treat stress.",
    category: "Stress and workload",
    competencies: ["stress_management", "workload_management", "decision_making"],
    level: "beginner",
    audience: "Aspiring and student pilots, with no psychology background needed.",
    objectives: [
      "Explain what stress is and where it comes from in flight training",
      "Describe how stress can affect attention and decisions",
      "Use a personal checklist before a training session",
      "Know when to speak to an instructor or a qualified professional",
    ],
    featured: true,
    modules: [
      {
        title: "Understanding stress",
        summary: "What stress is and why it matters in the cockpit.",
        lessons: [
          {
            title: "What stress is",
            summary: "Stress as a response to demands, and the difference between helpful and unhelpful levels.",
            durationMinutes: 10,
            isPreview: true,
            content: {
              objectives: [
                "Describe stress as the body's response to demands",
                "Distinguish acute stress from chronic stress",
                "Name common sources of stress in flight training",
              ],
              body: `## A normal response to demands

Stress is the body's response to the demands placed on it. A demand can be physical, such as heat or noise, or mental, such as a difficult radio call or a looming progress check. Stress is not a sign of weakness, and it is not something that only happens to other people.

Some activation can help. It can make you alert and ready to act. Trouble tends to begin when demands feel larger than your ability to deal with them.

## Acute and chronic stress

**Acute stress** is the short-term reaction to something happening now. Your heart rate rises and your attention sharpens on the immediate problem.

**Chronic stress** builds over a longer period, when pressure continues without enough recovery. Examples could include money worries during training, exam pressure or difficulties at home.

## Where stress comes from in training

It helps to sort sources of stress into three groups:

- **Environmental:** noise, heat, turbulence and weather.
- **Physical:** poor sleep, hunger, dehydration and illness.
- **Psychological:** fear of failing, comparison with other students and pressure to finish.

## An aviation example

Imagine a student preparing for a first solo cross-country flight. The forecast is marginal, they slept badly, and the booking is the last available this month. None of these alone may feel serious, but together they add to the demands the student is carrying before the engine has even started.

## What to take from this lesson

Noticing stress early gives you more options. In the next lesson, you will look at how stress can change attention and decision-making.

This lesson is educational. It does not assess your stress or your fitness to fly. If stress is affecting your wellbeing, speak to your instructor or a qualified professional.`,
              references: [INSTRUCTOR_HANDBOOK_CHAPTER_2, PHAK_CHAPTER_17],
            },
          },
          {
            title: "How stress affects attention and decisions",
            summary: "Why attention narrows under pressure and what that can mean in a busy circuit.",
            durationMinutes: 12,
          },
          {
            title: "Noticing your early signs",
            summary: "Spotting physical, mental and behavioural cues before workload peaks.",
            durationMinutes: 8,
          },
        ],
      },
      {
        title: "Stress in flight training",
        summary: "Applying the ideas to real training situations.",
        lessons: [
          {
            title: "Workload and busy phases of flight",
            summary: "Why stress and workload often arrive together, and how to plan ahead.",
            durationMinutes: 12,
          },
          {
            title: "Progress checks and exam pressure",
            summary: "Preparing for assessed moments without letting them take over.",
            durationMinutes: 10,
          },
          {
            title: "Life outside the aircraft",
            summary: "How money, study and relationships can follow you to the airfield.",
            durationMinutes: 8,
          },
        ],
      },
      {
        title: "Building your habits",
        summary: "Simple routines and knowing when to ask for help.",
        lessons: [
          {
            title: "Personal checklists before you fly",
            summary: "Using the IMSAFE memory aid as a self-check before a session.",
            durationMinutes: 10,
          },
          {
            title: "Recovery, sleep and routine",
            summary: "Making recovery part of your training plan.",
            durationMinutes: 8,
          },
          {
            title: "When and how to ask for help",
            summary: "Talking to instructors and qualified professionals.",
            durationMinutes: 8,
          },
        ],
      },
    ],
  },
  {
    slug: "aeronautical-decision-making",
    kind: "aeromind_original",
    instructorSlug: null,
    title: "Aeronautical Decision-Making",
    summary: "Learn structured ways to think through a decision, and how attitudes can quietly shape your choices.",
    description:
      "Good decisions can be learned. This course introduces the ideas behind aeronautical decision-making, including simple models for working through a problem and the attitudes that can get in the way. It is educational and never replaces your instructor or your flight school's procedures.",
    category: "Decision-making",
    competencies: ["decision_making", "situational_awareness"],
    level: "beginner",
    audience: "Aspiring and student pilots beginning to make their own decisions.",
    objectives: [
      "Explain what aeronautical decision-making is",
      "Work through a problem with a simple decision model",
      "Recognise the five hazardous attitudes",
    ],
    featured: true,
    modules: [
      {
        title: "Foundations",
        summary: "What decision-making means in aviation.",
        lessons: [
          {
            title: "Why decisions can be trained",
            summary: "Decision-making as a skill, and what hazardous attitudes are.",
            durationMinutes: 10,
            isPreview: true,
            content: {
              objectives: [
                "Explain why decision-making can be practised",
                "Name the five hazardous attitudes",
                "Match each attitude to a more helpful thought",
              ],
              body: `## Decisions are a skill

Aeronautical decision-making is a systematic way of working out the best course of action in a given situation. Like a landing, it improves with practice and honest feedback.

## Five hazardous attitudes

FAA guidance describes five attitudes that can get in the way of sound judgement. Everyone can show them at times. The point is to notice them, not to label yourself.

- **Anti-authority:** "Don't tell me." A more helpful thought: "Follow the rules. They are usually right."
- **Impulsivity:** "Do it quickly." A more helpful thought: "Not so fast. Think first."
- **Invulnerability:** "It won't happen to me." A more helpful thought: "It could happen to me."
- **Macho:** "I can do it." A more helpful thought: "Taking chances is foolish."
- **Resignation:** "What's the use?" A more helpful thought: "I'm not helpless. I can make a difference."

## An aviation example

A student sees cloud building on the route home, but a friend landed safely an hour ago. "It'll be fine, it always is" is invulnerability talking. Replacing that thought with "It could happen to me" does not make the decision for them, but it does prompt a fresh look at the weather and a conversation with an instructor.

## What to take from this lesson

Noticing the thought behind a decision is often the first step to improving it. Always follow your instructor and flight school procedures. This lesson is educational, not flight instruction.`,
              references: [PHAK_CHAPTER_2],
            },
          },
          {
            title: "Risk and the pilot in command",
            summary: "What responsibility for a decision means.",
            durationMinutes: 10,
          },
        ],
      },
      {
        title: "Decision models",
        summary: "Structured tools for working through a problem.",
        lessons: [
          {
            title: "The DECIDE model",
            summary: "A step-by-step way to approach a change in a situation.",
            durationMinutes: 12,
          },
          {
            title: "The 3P model",
            summary: "Perceive, process and perform as a routine.",
            durationMinutes: 10,
          },
        ],
      },
      {
        title: "Decisions under pressure",
        summary: "What changes when time is short.",
        lessons: [
          {
            title: "Time pressure and shortcuts",
            summary: "Why we simplify under pressure and when that causes problems.",
            durationMinutes: 10,
          },
          {
            title: "Learning from a decision",
            summary: "Reviewing what happened without blame.",
            durationMinutes: 8,
          },
        ],
      },
    ],
  },
  {
    slug: "fatigue-and-sleep-management",
    kind: "expert",
    instructorSlug: "ines-varga-sample",
    title: "Fatigue and Sleep Management",
    summary: "A demonstration expert course on how tiredness affects performance and how to plan for recovery.",
    description:
      "This demonstration course shows how an expert course could look on AeroMind Academy. Its instructor is fictional. It covers what fatigue is, how to notice it and how to plan around it during flight training.",
    category: "Fatigue and sleep",
    competencies: ["human_factors", "attention_management"],
    level: "beginner",
    audience: "Student pilots balancing training with study or work.",
    objectives: [
      "Describe what fatigue is and why it is difficult to judge in yourself",
      "Plan training around sleep and recovery",
    ],
    featured: false,
    modules: [
      {
        title: "What fatigue is",
        summary: "More than feeling sleepy.",
        lessons: [
          {
            title: "Fatigue in plain language",
            summary: "What fatigue is and why it is easy to underestimate.",
            durationMinutes: 8,
            isPreview: true,
            content: {
              objectives: [
                "Describe fatigue in your own words",
                "Explain why people can misjudge their own tiredness",
              ],
              body: `## More than feeling sleepy

Fatigue is a reduced ability to perform, caused by things such as too little sleep, long periods awake, the time of day or sustained workload. It can affect attention, memory and how quickly you respond.

## Why it is easy to miss

Tired people are often poor judges of how tired they are. You may feel fine while your performance has already dropped. That is why planning for rest works better than relying on how you feel at the time.

## In the wider industry

Aviation treats fatigue as a safety matter, not a personal failing. In Europe, EASA requires operators to manage fatigue through flight time limitations and fatigue risk management.

## An aviation example

A student finishes a late work shift, sleeps five hours and arrives for an early lesson. They feel alert after a coffee, but a missed radio call and a slow scan suggest otherwise. Talking to the instructor before flying gives them both a better basis for deciding what to do.

## What to take from this lesson

Plan your sleep as carefully as you plan your flight. This lesson is educational. It does not assess your fitness to fly.`,
              references: [EASA_FATIGUE, PHAK_CHAPTER_17],
            },
          },
          {
            title: "Sleep and the body clock",
            summary: "Why the time of day matters.",
            durationMinutes: 10,
          },
        ],
      },
      {
        title: "Noticing fatigue",
        summary: "Signs to look for in yourself.",
        lessons: [
          {
            title: "Signs you might miss",
            summary: "Behavioural clues that you are more tired than you feel.",
            durationMinutes: 8,
          },
          {
            title: "Workload, stress and tiredness",
            summary: "How these factors add up.",
            durationMinutes: 8,
          },
        ],
      },
      {
        title: "Planning for recovery",
        summary: "Building rest into training.",
        lessons: [
          {
            title: "Planning your training week",
            summary: "Fitting flying around study and work.",
            durationMinutes: 10,
          },
          {
            title: "Being honest about tiredness",
            summary: "Talking to your instructor and changing plans.",
            durationMinutes: 6,
          },
        ],
      },
    ],
  },
  {
    slug: "cognitive-biases-in-aviation",
    kind: "expert",
    instructorSlug: "marek-holt-sample",
    title: "Cognitive Biases in Aviation",
    summary: "A demonstration expert course on the mental shortcuts that can quietly steer a pilot's decisions.",
    description:
      "This demonstration course shows how an expert course could look on AeroMind Academy. Its instructor is fictional. It introduces common mental shortcuts and how structured habits can help counter them.",
    category: "Decision-making",
    competencies: ["decision_making", "situational_awareness", "human_factors"],
    level: "intermediate",
    audience: "Student pilots who have completed some flight training.",
    objectives: [
      "Explain what a cognitive bias is",
      "Recognise confirmation bias and continuing with a plan despite new information",
    ],
    featured: false,
    modules: [
      {
        title: "Mental shortcuts",
        summary: "Why the brain simplifies.",
        lessons: [
          {
            title: "What a cognitive bias is",
            summary: "Shortcuts that are usually useful and sometimes misleading.",
            durationMinutes: 8,
            isPreview: true,
            content: {
              objectives: [
                "Define a cognitive bias in simple terms",
                "Explain why noticing a bias is not enough by itself",
              ],
              body: `## Useful shortcuts

Your brain handles a huge amount of information by taking shortcuts. Most of the time, they serve you well. A cognitive bias is a predictable way those shortcuts can lead your thinking off course.

## An example: seeing what you expect

Confirmation bias is the tendency to notice information that supports what you already believe and to pass over information that does not.

## An aviation example

A student expects the weather to hold because the morning was clear. On the way back, they notice the patch of blue ahead and pay less attention to the lowering cloud around it. Nothing about this means they are a poor pilot. It is an ordinary way for attention to work.

## Why knowing is not enough

Knowing that a bias exists does not switch it off. That is one reason aviation relies on habits that do not depend on how you feel, such as checklists, briefings and agreed decision points set before the flight.

## What to take from this lesson

Ask one simple question when you feel certain: what would I expect to see if I were wrong? This lesson is educational, not flight instruction. Always follow your instructor and flight school procedures.`,
              references: [PHAK_CHAPTER_2],
            },
          },
          {
            title: "Why smart people are affected too",
            summary: "Bias is about how attention works, not about intelligence.",
            durationMinutes: 8,
          },
        ],
      },
      {
        title: "Biases in the cockpit",
        summary: "Common examples in flight training.",
        lessons: [
          {
            title: "Confirmation bias",
            summary: "Looking for evidence that you are right.",
            durationMinutes: 10,
          },
          {
            title: "Continuing with the plan",
            summary: "Why changing a plan can feel harder than it should.",
            durationMinutes: 10,
          },
        ],
      },
      {
        title: "Countering bias",
        summary: "Habits that help.",
        lessons: [
          {
            title: "Decision points and briefings",
            summary: "Making decisions before pressure arrives.",
            durationMinutes: 10,
          },
          {
            title: "Asking for a second view",
            summary: "Using other people to check your thinking.",
            durationMinutes: 8,
          },
        ],
      },
    ],
  },
];

type DemoResource = {
  title: string;
  description: string;
  kind: "guide" | "research_article" | "educational_pdf" | "case_study";
  author: string;
  sourceName: string;
  sourceUrl: string;
  licence: "public_domain" | "link_only";
  licenceNote: string;
  access: "public" | "free_account" | "enrolled";
  courseSlugs: string[];
};

/** Real public sources. AeroMind links to them and hosts no copies. */
export const DEMO_RESOURCES: DemoResource[] = [
  {
    title: PHAK_CHAPTER_2.title,
    description: "The FAA's chapter on aeronautical decision-making, including hazardous attitudes and stress management.",
    kind: "guide",
    author: "Federal Aviation Administration",
    sourceName: "FAA",
    sourceUrl: PHAK_CHAPTER_2.url,
    licence: "link_only",
    licenceNote: "Linked to the original. Reuse and AI indexing have not been reviewed.",
    access: "public",
    courseSlugs: ["aeronautical-decision-making", "cognitive-biases-in-aviation", "stress-management-in-aviation"],
  },
  {
    title: PHAK_CHAPTER_17.title,
    description: "The FAA's chapter on aeromedical factors, including stress and fatigue.",
    kind: "guide",
    author: "Federal Aviation Administration",
    sourceName: "FAA",
    sourceUrl: PHAK_CHAPTER_17.url,
    licence: "link_only",
    licenceNote: "Linked to the original. Reuse and AI indexing have not been reviewed.",
    access: "public",
    courseSlugs: ["stress-management-in-aviation", "fatigue-and-sleep-management"],
  },
  {
    title: INSTRUCTOR_HANDBOOK_CHAPTER_2.title,
    description: "An FAA chapter on human behaviour in training, including how stress is defined and handled.",
    kind: "educational_pdf",
    author: "Federal Aviation Administration",
    sourceName: "FAA",
    sourceUrl: INSTRUCTOR_HANDBOOK_CHAPTER_2.url,
    licence: "link_only",
    licenceNote: "Linked to the original. Reuse and AI indexing have not been reviewed.",
    access: "free_account",
    courseSlugs: ["stress-management-in-aviation"],
  },
  {
    title: EASA_FATIGUE.title,
    description: "EASA's overview of fatigue risk management in air operations.",
    kind: "guide",
    author: "European Union Aviation Safety Agency",
    sourceName: "EASA",
    sourceUrl: EASA_FATIGUE.url,
    licence: "link_only",
    licenceNote: "Linked to the original. Reuse and AI indexing have not been reviewed.",
    access: "enrolled",
    courseSlugs: ["fatigue-and-sleep-management"],
  },
];
