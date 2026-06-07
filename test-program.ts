async function testProgramFlow() {
  console.log("Submitting Program Enrollment Request...");
  
  const payload = {
    programId: "prog_sleep_123",
    name: "QA Test Program Patient",
    phone: "+918888888888",
    email: "qa-program@meditonic.com",
    age: 45,
    gender: "male"
  };

  try {
    const res = await fetch("http://localhost:3001/api/program-order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    console.log("Status:", res.status);
    console.log("Data:", data);
  } catch (e) {
    console.error("Fetch failed:", e);
  }
}

testProgramFlow();
