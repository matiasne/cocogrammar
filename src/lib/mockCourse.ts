// Dev-only mock course so the full course flow (sidebar, chapters, challenges,
// scoring, finishing) can be exercised locally without generating a real course
// via the Opus API or seeding the database.
//
// Mock chapter ids are prefixed with MOCK_ID_PREFIX so the client can recognize
// them and short-circuit the finish/score API calls (which need real DB rows).
// Grading still hits the real /api/chapter/grade endpoint — it works on any
// prompt/answer pair and needs no course row.

export const MOCK_ID_PREFIX = "mock-";

export const isMockId = (id: string) => id.startsWith(MOCK_ID_PREFIX);

// Kept structurally identical to the CourseWithChapters shape returned by
// /api/course so it drops straight into CourseView.
export const MOCK_COURSE = {
  courseId: `${MOCK_ID_PREFIX}course`,
  title: "Your recurring slips, pressed into a course",
  summary:
    "A dev mock course covering the habits that showed up most across your writing: article usage, verb tense agreement, and prepositions. Each chapter is one recurring slip — finish it to clear it from the box.",
  level: "Intermediate (B1)",
  totalChapters: 3,
  chapters: [
    {
      id: `${MOCK_ID_PREFIX}chapter-1`,
      category: "articles",
      orderIndex: 0,
      score: null,
      content: {
        title: "Dropping the article",
        focusArea: "Definite & indefinite articles",
        why: "You often leave out 'a', 'an', and 'the' before nouns — common for speakers whose first language has no articles. These exercises drill the moments where English requires one.",
        exercises: [
          {
            prompt: "Add the missing article: 'I saw ___ dog in the park.'",
            type: "fill-in-the-blank",
            answer: "I saw a dog in the park.",
          },
          {
            prompt: "Correct this sentence: 'She is best student in class.'",
            type: "correction",
            answer: "She is the best student in the class.",
          },
          {
            prompt: "Translate the idea: describe going to your job using 'the office'.",
            type: "open-response",
            answer: "I go to the office every morning.",
          },
        ],
      },
    },
    {
      id: `${MOCK_ID_PREFIX}chapter-2`,
      category: "verb-tense",
      orderIndex: 1,
      score: null,
      content: {
        title: "Present perfect vs. past simple",
        focusArea: "Verb tense agreement",
        why: "You tend to reach for the past simple where English wants the present perfect (and vice versa). This chapter targets the 'have you ever / I have already' patterns that trip you up.",
        exercises: [
          {
            prompt: "Choose the right tense: 'I ___ (live) here for five years.'",
            type: "fill-in-the-blank",
            answer: "I have lived here for five years.",
          },
          {
            prompt: "Correct this sentence: 'Did you ever been to Japan?'",
            type: "correction",
            answer: "Have you ever been to Japan?",
          },
          {
            prompt: "Write a sentence using 'already' with the present perfect.",
            type: "open-response",
            answer: "I have already finished my homework.",
          },
        ],
      },
    },
    {
      id: `${MOCK_ID_PREFIX}chapter-3`,
      category: "prepositions",
      orderIndex: 2,
      score: null,
      content: {
        title: "In, on, at — time & place",
        focusArea: "Prepositions of time and place",
        why: "Prepositions rarely map one-to-one across languages, so 'in Monday' or 'at the weekend' slip through. These drills anchor the most frequent time/place pairings.",
        exercises: [
          {
            prompt: "Fill in the preposition: 'The meeting is ___ 3 o'clock.'",
            type: "fill-in-the-blank",
            answer: "The meeting is at 3 o'clock.",
          },
          {
            prompt: "Correct this sentence: 'I was born on 1998.'",
            type: "correction",
            answer: "I was born in 1998.",
          },
          {
            prompt: "Write a sentence using 'on' with a day of the week.",
            type: "open-response",
            answer: "I have a class on Monday.",
          },
        ],
      },
    },
  ],
};
