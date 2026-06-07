import { google } from "googleapis";

// Define the shape of data we expect to append
export type CaseRowData = {
  caseId: string;
  date: string;
  patientName: string;
  mobile: string;
  caseType: string;
  concern: string;
  assignedDoctor: string;
  status: string;
  paymentStatus: string;
};

// Ensure credentials exist
function getAuthClient() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  let privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n') || "";
  
  if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
    privateKey = privateKey.substring(1, privateKey.length - 1);
  }

  if (!email || !privateKey) {
    throw new Error("Missing Google Service Account credentials in environment variables.");
  }

  return new google.auth.JWT({
    email,
    key: privateKey,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"]
  });
}

export async function appendCaseToSheet(rowData: CaseRowData) {
  const spreadsheetId = process.env.MEDITONIC_OPERATIONS_SHEET_ID;
  if (!spreadsheetId) {
    throw new Error("Missing MEDITONIC_OPERATIONS_SHEET_ID in environment variables.");
  }

  const auth = getAuthClient();
  const sheets = google.sheets({ version: "v4", auth });

  const values = [
    [
      rowData.caseId,
      rowData.date,
      rowData.patientName,
      rowData.mobile,
      rowData.caseType,
      rowData.concern,
      rowData.assignedDoctor,
      rowData.status,
      rowData.paymentStatus
    ]
  ];

  try {
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: "All Cases!A:I", // Assuming tab is named "All Cases"
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values,
      },
    });
    console.log("Successfully appended case to Google Sheets:", rowData.caseId);
  } catch (error) {
    console.error("Google Sheets API error:", error);
    throw error;
  }
}
