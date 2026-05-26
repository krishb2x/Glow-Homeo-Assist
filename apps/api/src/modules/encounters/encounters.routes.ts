/**
 * Encounters bounded context (consultations, finalize side-effects).
 *
 * Route handlers remain in `server.ts` for now — migrate incrementally to
 * `encounters.routes.ts` without breaking the monolith in one PR.
 */
export { runConsultationFinalizeSideEffects } from "./v2EncountersService";

export {
  buildPrescriptionSlipHtml,
  buildClinicalSummaryHtml,
  toRxLine,
  toRxLines
} from "@homeoassist/print";
