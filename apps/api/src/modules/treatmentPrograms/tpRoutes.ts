import { Router } from "express";
import { z } from "zod";
import { getDb } from "../../db";
import { authRequired } from "../../auth";
import type { AuthClaims } from "../../auth";
import { createProgram, getProgramBlueprint, assignPatientToProgram, getPatientJourney } from "./tpService";
import { migrateLegacyCarePlans } from "./migrationTool";
import { logger } from "../../lib/logger";

const router = Router();
router.use(authRequired);

/**
 * POST /api/tp/programs
 * Create a new master program.
 */
router.post("/programs", async (req, res) => {
  try {
    const user = (req as any).user as AuthClaims;
    const client = getDb(user);

    if (!user.clinicId) {
      res.status(403).json({ error: "Clinic context required" });
      return;
    }

    const program = await createProgram(client, user.clinicId, user.userId, req.body);
    res.status(201).json({ program });
  } catch (error) {
    logger.error("tp_create_program_route_error", { error: error instanceof Error ? error.message : String(error) });
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: "Invalid payload", details: error.errors });
      return;
    }
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * GET /api/tp/programs/:id/blueprint
 * Fetch the complete structure of a program (steps + blocks).
 */
router.get("/programs/:id/blueprint", async (req, res) => {
  try {
    const user = (req as any).user as AuthClaims;
    const client = getDb(user);
    const { id } = req.params;

    const program = await getProgramBlueprint(client, id);
    if (!program) {
      res.status(404).json({ error: "Program not found" });
      return;
    }

    res.json({ program });
  } catch (error) {
    logger.error("tp_get_blueprint_route_error", { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * POST /api/tp/assignments
 * Enroll a patient in a program.
 */
router.post("/assignments", async (req, res) => {
  try {
    const user = (req as any).user as AuthClaims;
    const client = getDb(user);
    const { patientId, programId } = req.body;

    if (!patientId || !programId) {
      res.status(400).json({ error: "Missing patientId or programId" });
      return;
    }

    const assignment = await assignPatientToProgram(client, patientId, programId);
    res.status(201).json({ assignment });
  } catch (error) {
    logger.error("tp_assign_route_error", { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * GET /api/tp/assignments/:id/journey
 * Get the full journey state for a specific assignment.
 */
router.get("/assignments/:id/journey", async (req, res) => {
  try {
    const user = (req as any).user as AuthClaims;
    const client = getDb(user);
    const { id } = req.params;

    const journey = await getPatientJourney(client, id);
    if (!journey) {
      res.status(404).json({ error: "Journey not found" });
      return;
    }

    res.json({ journey });
  } catch (error) {
    logger.error("tp_get_journey_route_error", { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * POST /api/tp/migrate
 * Trigger the Phase 5 Migration tool to port legacy Care Plans into V1 Treatment Programs.
 */
router.post("/migrate", async (req, res) => {
  try {
    const user = (req as any).user as AuthClaims;
    // Note: Use a service role client to bypass RLS for migration, 
    // or standard DB client if RLS is setup appropriately.
    const client = getDb(user); 
    
    // For V1, assume clinicId is passed or inferred from the user.
    // In GlowHomeo, doctor claims typically include clinic access.
    const clinicId = req.body.clinicId; 
    if (!clinicId) {
      res.status(400).json({ error: "Missing clinicId" });
      return;
    }

    const result = await migrateLegacyCarePlans(client, clinicId);
    res.json(result);
  } catch (error) {
    logger.error("tp_migration_route_error", { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ error: "Internal server error" });
  }
});

export function registerTreatmentProgramRoutes(app: import("express").Application) {
  app.use("/api/tp", router);
}
