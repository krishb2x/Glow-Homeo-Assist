const { processStoreFulfillment } = require('../apps/meditonic/lib/storeFulfillment');
require('dotenv').config({ path: 'd:/HomeoAssist/.env' });

async function testFulfillment() {
  const testOrderId = "4fc8f9dc-bfb3-4926-baa3-95b14148f89b";
  console.log(`=== Testing processStoreFulfillment for order ${testOrderId} ===`);
  try {
    const result = await processStoreFulfillment(testOrderId);
    console.log("Fulfillment run completed successfully!");
    console.log("Result:", result);
  } catch (err) {
    console.error("Fulfillment run FAILED with error:");
    console.error(err);
  }
}

testFulfillment();
