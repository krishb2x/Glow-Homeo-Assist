try {
  const pg = require('pg');
  console.log("pg is available:", pg);
} catch (e) {
  console.log("pg is not available:", e.message);
}
