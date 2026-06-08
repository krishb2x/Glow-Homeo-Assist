const BASE_URL = 'http://localhost:3005';

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

testStorePurchase();
