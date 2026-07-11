import type { OnboardingBlocksState } from "./actions/chat-onboarding";

// Plain module (no "use server"): a "use server" file can only export async
// functions, never a plain object — this constant crossing the client/server
// boundary (imported by onboarding-chat.tsx) is exactly what triggered
// "A 'use server' file can only export async functions, found object." at runtime.
export const EMPTY_ONBOARDING_BLOCKS: OnboardingBlocksState = {
  header: {
    status: "empty",
    data: {
      universita: null,
      corso: null,
      livello: null,
      anno: null,
      anno_inizio: null,
      laurea_anno: null,
      media_voti: null,
      formazione_precedente: null,
    },
    visibility: { media_voti: { associazioni: false, aziende: false } },
  },
  formazione: { status: "empty", data: { items: [] } },
  esperienze: { status: "empty", data: { items: [] } },
  disponibilita: { status: "empty", data: { cosa_cerca: null, ambito: null, periodo: null, dove: null } },
  competenze: { status: "empty", data: { items: [], soft_skills: [] } },
  lingue: { status: "empty", data: { items: [] } },
  interessi: { status: "empty", data: { testo: null } },
  autodescrizione: { status: "empty", data: { testo: null } },
  piano_carriera: { status: "empty", data: { stato: "esplorazione", testo: null } },
};
