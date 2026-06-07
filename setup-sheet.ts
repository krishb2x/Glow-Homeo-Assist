import { google } from "googleapis";
import * as dotenv from "dotenv";
import path from "path";
import { getAuthClient } from "./apps/meditonic/lib/google-sheets";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

async function setupSheet() {
  const spreadsheetId = process.env.MEDITONIC_OPERATIONS_SHEET_ID;
  if (!spreadsheetId) {
    console.error("Missing MEDITONIC_OPERATIONS_SHEET_ID");
    return;
  }

  const auth = getAuthClient();
  const sheets = google.sheets({ version: "v4", auth });

  console.log(`Setting up Google Sheet: ${spreadsheetId}`);

  try {
    // 1. Clear existing sheet
    await sheets.spreadsheets.values.clear({
      spreadsheetId,
      range: "Sheet1!A1:I1000",
    });

    // 2. Set headers and Dummy Data
    const dummyData = [
      ["Case ID", "Date", "Patient Name", "Mobile", "Case Type", "Concern", "Assigned Doctor", "Status", "Payment Status"],
      ["MT-2026-AB12C3", new Date().toISOString().split("T")[0], "Priya Sharma", "+919876543210", "Consultation", "PCOD & Hormonal Imbalance", "Dr. Aman Agrawal", "Confirmed", "Captured"],
      ["MT-2026-XY98Z7", new Date().toISOString().split("T")[0], "Rahul Verma", "+919876543211", "Program", "Deep Sleep Wellness", "Pending Assignment", "Active", "Captured"],
      ["MT-2026-PQ45R6", new Date().toISOString().split("T")[0], "Anita Desai", "+919876543212", "eBook", "Thyroid Healing Guide", "N/A", "Delivered", "Captured"],
      ["MT-2026-LM34N5", new Date().toISOString().split("T")[0], "Sneha Patel", "+919876543213", "Consultation", "Severe Anxiety", "Dr. Aman Agrawal", "Completed", "Captured"],
      ["MT-2026-JK76H8", new Date().toISOString().split("T")[0], "Vikram Singh", "+919876543214", "Program", "Hormonal Harmony Protocol", "Dr. Aman Agrawal", "Active", "Captured"],
    ];

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: "Sheet1!A1",
      valueInputOption: "USER_ENTERED",
      requestBody: { values: dummyData },
    });

    // 3. Apply Formatting (Bold Headers, Background Color)
    // First, get the sheetId of "Sheet1"
    const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
    const sheet = spreadsheet.data.sheets?.find(s => s.properties?.title === "Sheet1");
    const sheetId = sheet?.properties?.sheetId || 0;

    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          {
            repeatCell: {
              range: {
                sheetId: sheetId,
                startRowIndex: 0,
                endRowIndex: 1,
                startColumnIndex: 0,
                endColumnIndex: 9,
              },
              cell: {
                userEnteredFormat: {
                  backgroundColor: { red: 0.1, green: 0.42, blue: 0.36 }, // #1B6B5C (MediTonic Primary)
                  textFormat: {
                    foregroundColor: { red: 1, green: 1, blue: 1 }, // White text
                    bold: true,
                    fontSize: 11
                  },
                  horizontalAlignment: "CENTER",
                }
              },
              fields: "userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)"
            }
          },
          {
            autoResizeDimensions: {
              dimensions: {
                sheetId: sheetId,
                dimension: "COLUMNS",
                startIndex: 0,
                endIndex: 9
              }
            }
          }
        ]
      }
    });

    console.log("Successfully configured Google Sheet with exact formatting and dummy data.");
  } catch (err: any) {
    console.error("Failed to setup sheet:", err.message);
  }
}

setupSheet();
