console.log("Keys in process.env:", Object.keys(process.env).filter(k => k.toLowerCase().includes("pass") || k.toLowerCase().includes("db") || k.toLowerCase().includes("sql") || k.toLowerCase().includes("key") || k.toLowerCase().includes("url")));
if (process.env.SUPABASE_DB_PASSWORD) {
  console.log("Found SUPABASE_DB_PASSWORD!");
}
if (process.env.DATABASE_PASSWORD) {
  console.log("Found DATABASE_PASSWORD!");
}
