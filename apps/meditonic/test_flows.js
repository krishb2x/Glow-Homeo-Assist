const BASE_URL = 'http://localhost:3005';

async function testBooking() {
  console.log("=== Testing Consultation Booking ===");
  try {
    const payload = {
      name: "Test User " + Date.now(),
      phone: "9876543210",
      email: "test@example.com",
      age: "30",
      gender: "male",
      type: "initial_online",
      concernCategory: "Respiratory",
      concernDescription: "Asthma since 1 year"
    };

    const res = await fetch(`${BASE_URL}/api/consultation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const text = await res.text();
    console.log("Status:", res.status);
    try {
      const data = JSON.parse(text);
      console.log("Response:", data);
      return data;
    } catch {
      console.log("Response Text:", text.substring(0, 500));
    }
  } catch (err) {
    console.error("Booking Test Failed", err);
  }
}

async function testAssignDoctor(caseId) {
  console.log(`\n=== Testing Doctor Assignment for Case ${caseId} ===`);
  try {
    const res = await fetch(`${BASE_URL}/api/admin/cases/${caseId}/assign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ doctorId: "00000000-0000-0000-0000-000000000000" })
    });

    const text = await res.text();
    console.log("Status:", res.status);
    try {
      const data = JSON.parse(text);
      console.log("Response:", data);
      return data;
    } catch {
      console.log("Response Text:", text.substring(0, 500));
    }
  } catch (err) {
    console.error("Assign Test Failed", err);
  }
}

async function testWebhook(orderId) {
  console.log(`\n=== Testing Razorpay Webhook for Order ${orderId} ===`);
  try {
    const payload = {
      event: "payment.captured",
      payload: {
        payment: {
          entity: {
            id: "pay_test_" + Date.now(),
            order_id: orderId,
            amount: 20000 // In paise (200 INR)
          }
        }
      }
    };

    const res = await fetch(`${BASE_URL}/api/webhooks/razorpay`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'x-razorpay-signature': 'test_signature_bypass' 
      },
      body: JSON.stringify(payload)
    });

    const text = await res.text();
    console.log("Status:", res.status);
    try {
      const data = JSON.parse(text);
      console.log("Response:", data);
      return data;
    } catch {
      console.log("Response Text:", text.substring(0, 500));
    }
  } catch (err) {
    console.error("Webhook Test Failed", err);
  }
}

async function testWebhook(orderId) {
  // ... existing webhook logic
}

async function testStorePurchase() {
  console.log(`\n=== Testing Store Purchase Flow ===`);
  try {
    const payload = {
      amount: 150,
      contact: { name: "Store Tester", email: "store@example.com", phone: "9988776655" },
      items: [
        {
          product: { id: "1", title: "Test Book", price: 150, type: "ebook" },
          quantity: 1,
          utm_source: "fb_ads",
          utm_campaign: "summer_sale"
        }
      ]
    };

    console.log("1. Creating Order...");
    const createRes = await fetch(`${BASE_URL}/api/razorpay/create-order`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    const createData = await createRes.json();
    console.log("Create Response:", createData);

    if (createData.orderId && createData.mtOrderId) {
      console.log("2. Verifying Payment...");
      const verifyRes = await fetch(`${BASE_URL}/api/razorpay/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          razorpay_order_id: createData.orderId,
          razorpay_payment_id: "pay_fake_12345",
          razorpay_signature: "test_signature_bypass",
          mtOrderId: createData.mtOrderId
        })
      });
      
      const verifyData = await verifyRes.json();
      console.log("Verify Response:", verifyData);
    }
  } catch (err) {
    console.error("Store Purchase Test Failed", err);
  }
}

async function runAll() {
  const booking = await testBooking();
  if (booking && booking.success) {
    await testAssignDoctor(booking.consultationId);
    await testWebhook(booking.razorpayOrderId);
  }
  await testStorePurchase();
}

runAll();
