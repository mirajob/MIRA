// Plain module (no "use server"): a "use server" file can only export async
// functions, never a plain array — same reason EMPTY_ONBOARDING_BLOCKS lives
// in its own file (see onboarding-defaults.ts).
//
// The 5-question forced-choice soft-skill quiz is fixed content, not AI-generated.
// The card text is always English regardless of chat locale (MIRA card is always
// English — see startFaseB's academic-skill prompt for the same rule). The IT/EN
// chat copy for the question/option labels lives in messages/{it,en}.json under
// OnboardingEngine.softSkillQuestions — this module only holds what gets saved.
export const SOFT_SKILL_CARD_TEXT: { A: string; B: string }[] = [
  {
    A: "Comfortable presenting in front of an audience — usually the one who presents in group work",
    B: "Strongest on preparing content and analysis — prefers others to do the presenting",
  },
  {
    A: "At ease with cold outreach — comfortable contacting people they don't know",
    B: "Does their best work on the material itself — prefers joining conversations once started",
  },
  {
    A: "Plans ahead with clear milestones and sticks to them",
    B: "Works in iterations — reliably effective under deadline pressure",
  },
  {
    A: "Prefers clear and stable briefs — re-plans methodically when things change",
    B: "Comfortable with last-minute changes and shifting priorities",
  },
  {
    A: "Energized by working closely with others day to day",
    B: "Does their best work in focused solo sessions, syncing with the team at key points",
  },
];

export const SOFT_SKILL_QUESTION_COUNT = SOFT_SKILL_CARD_TEXT.length;
