import { appendCaseToSheet } from "./apps/meditonic/lib/google-sheets";
import dotenv from "dotenv";

dotenv.config();

async function testConnection() {
  console.log("Testing Google Sheets connection...");
  try {
    await appendCaseToSheet({
      caseId: `TEST-${Date.now()}`,
      date: new Date().toISOString(),
      patientName: "System Test",
      mobile: "+10000000000",
      caseType: "test",
      concern: "system-check",
      assignedDoctor: "Unassigned",
      status: "test",
      paymentStatus: "test"
    });
    console.log("✅ Google Sheets connection successful! Test row appended.");
  } catch (error) {
    console.error("❌ Google Sheets connection failed:", error);
  }
}

testConnection();
