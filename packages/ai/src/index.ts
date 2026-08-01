export { chatCompletion, AI_CONFIG } from "./provider";
export type { ChatMessage } from "./provider";
export { generateAssociationPage, scrapeWebsiteText } from "./modules/association-page-generator";
export { matchCandidates } from "./modules/candidate-matcher";
export { parseTranscriptFile, formatTranscriptForChat, TRANSCRIPT_MODEL } from "./modules/transcript-parser";
export type { ParsedTranscript, ParsedCourse } from "./modules/transcript-parser";
export { parseCVFile, formatCVForChat } from "./modules/cv-parser";
export type { ParsedCV, ParsedCVExperience } from "./modules/cv-parser";
export { syncCardBlockStructuredData } from "./modules/card-block-sync";
export { GEMINI_MODELS, GEMINI_PRICING, estimateGeminiCost } from "./modules/gemini-client";
export type { GeminiModel, GeminiUsage } from "./modules/gemini-client";
export {
  parseTranscriptWithGemini,
  parseCVWithGemini,
  recomputeTranscriptAverages,
} from "./modules/gemini-parsers";
export type { GeminiParseResult } from "./modules/gemini-parsers";
