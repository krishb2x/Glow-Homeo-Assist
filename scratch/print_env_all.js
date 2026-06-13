console.log("All environment variables:", Object.keys(process.env));
if (process.env.PGPASSWORD) {
  console.log("Found PGPASSWORD!");
}
