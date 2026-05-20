/**
 * Encounters bounded context (consultations, scribe, finalize side-effects).
 *
 * Route handlers remain in `server.ts` for now — migrate incrementally to
 * `encounters.routes.ts` without breaking the monolith in one PR.
 */
export {
  startAudioSession,
  endAudioSession,
  createScribeJob,
  updateScribeJob,
  runConsultationFinalizeSideEffects,
  purgeExpiredAudioSessions
} from "./v2EncountersService";

export {
  buildPrescriptionSlipHtml,
  buildClinicalSummaryHtml,
  toRxLine,
  toRxLines,
  openRxPrintWindow
} from "@homeoassist/print";
