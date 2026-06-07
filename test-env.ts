import dotenv from "dotenv";

dotenv.config();

console.log("Email starts with quote:", process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.startsWith('"'));
console.log("Email:", process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL);
console.log("Key starts with quote:", process.env.GOOGLE_PRIVATE_KEY?.startsWith('"'));
const key = process.env.GOOGLE_PRIVATE_KEY || "";
console.log("Key chars:", key.substring(0, 30));
console.log("Has literal slash-n:", key.includes("\\n"));
console.log("Has actual newline:", key.includes("\n"));
