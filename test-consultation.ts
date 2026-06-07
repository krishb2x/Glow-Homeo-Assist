async function testConsultationFlow() {
  console.log("Submitting Consultation Request...");
  
  const payload = {
    name: "QA Test Patient",
    phone: "+919999999999",
    email: "qa@meditonic.com",
    age: 30,
    gender: "other",
    type: "initial_online",
    concernCategory: "hair-loss",
    concernDescription: "Automated test description."
  };

  try {
    const res = await fetch("http://localhost:3001/api/consultation", {
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

testConsultationFlow();
