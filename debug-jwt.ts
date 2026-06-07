import dotenv from "dotenv";
import { google } from "googleapis";

dotenv.config();

async function run() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  let privateKey = process.env.GOOGLE_PRIVATE_KEY || "";
  
  if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
    privateKey = privateKey.substring(1, privateKey.length - 1);
  }
  privateKey = privateKey.replace(/\\n/g, '\n');

  console.log("--- DEBUG CREDENTIALS ---");
  console.log("Email:", email);
  console.log("Private Key Starts With:", privateKey.substring(0, 30));
  console.log("Private Key Ends With:", privateKey.substring(privateKey.length - 30));
  console.log("Has actual newlines?", privateKey.includes('\n'));
  
  const auth = new google.auth.JWT(
    email,
    undefined,
    privateKey,
    ["https://www.googleapis.com/auth/spreadsheets"]
  );

  try {
    const token = await auth.getAccessToken();
    console.log("✅ Successfully generated access token:", token.token ? "YES" : "NO");
  } catch (err: any) {
    console.error("❌ Failed to get access token:", err.message);
  }
}

run();
