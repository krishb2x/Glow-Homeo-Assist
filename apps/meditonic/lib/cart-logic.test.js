const assert = require('assert');

function calculateBundleUpsell(cartItems, seriesBooks, bundlePrice) {
  // Get books user already has in cart for this series
  const userSeriesItems = cartItems.filter(item => 
    seriesBooks.some(sb => sb.id === item.product.id)
  );
  
  const userSeriesCount = userSeriesItems.reduce((acc, item) => acc + item.quantity, 0);
  
  if (userSeriesCount === 0 || userSeriesCount >= seriesBooks.length) {
    return null; // Not applicable or already has all
  }

  // Calculate what they have already paid/added for this series
  const valueAlreadyInCart = userSeriesItems.reduce((acc, item) => acc + (item.product.price * item.quantity), 0);
  
  // They only need to pay the remaining amount of the bundle
  const remainingCost = Math.max(0, bundlePrice - valueAlreadyInCart);
  const remainingBooksCount = seriesBooks.length - userSeriesCount;
  
  // Calculate savings compared to buying remaining individually
  // Assumption: individual books are 150 each
  const remainingIndividualCost = remainingBooksCount * 150;
  const savings = remainingIndividualCost - remainingCost;

  return {
    userSeriesCount,
    totalSeriesCount: seriesBooks.length,
    remainingBooksCount,
    remainingCost,
    savings
  };
}

// === TESTS ===
function runTests() {
  console.log("Running Cart Logic Tests...");
  
  const seriesBooks = [
    { id: '1', title: 'Diag 1', price: 150 },
    { id: '2', title: 'Diag 2', price: 150 },
    { id: '3', title: 'Diag 3', price: 150 },
    { id: '4', title: 'Diag 4', price: 150 },
    { id: '5', title: 'Diag 5', price: 150 },
  ];
  
  const cartWith2Books = [
    { product: { id: '1', price: 150 }, quantity: 1 },
    { product: { id: '2', price: 150 }, quantity: 1 }
  ];

  // Full bundle is 699. They have 2 books (value 300).
  // Remaining cost = 699 - 300 = 399.
  // Remaining books = 3. Buying individually = 3 * 150 = 450.
  // Savings = 450 - 399 = 51.
  
  const result = calculateBundleUpsell(cartWith2Books, seriesBooks, 699);
  
  assert.strictEqual(result.userSeriesCount, 2);
  assert.strictEqual(result.remainingBooksCount, 3);
  assert.strictEqual(result.remainingCost, 399);
  assert.strictEqual(result.savings, 51);

  console.log("✅ Bundle Upsell Calculation tests passed!");
}

runTests();

module.exports = { calculateBundleUpsell };
