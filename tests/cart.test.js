const assert = require('assert');
const cartService = require('../server/services/cartService');
const db = require('../server/config/db');

async function testCart() {
  console.log('--- RUNNING CART TESTS ---');

  // Find a test user or create temporary one
  const [users] = await db.query('SELECT id FROM users WHERE email = ? LIMIT 1', ['customer@example.com']);
  assert.ok(users.length > 0, 'Seed customer must exist');
  const userId = users[0].id;

  // Clear cart before test
  await cartService.clearCart(userId);

  // Get active product
  const [prods] = await db.query('SELECT id, name, price, stock_quantity FROM products WHERE is_active = 1 AND stock_quantity > 5 LIMIT 1');
  assert.ok(prods.length > 0, 'At least one in-stock product must exist');
  const product = prods[0];

  // Test 1: Add product to cart
  const cartAfterAdd = await cartService.addToCart(userId, { productId: product.id, quantity: 2 });
  assert.strictEqual(cartAfterAdd.items.length, 1);
  assert.strictEqual(cartAfterAdd.items[0].product_id, product.id);
  assert.strictEqual(cartAfterAdd.items[0].quantity, 2);
  console.log('✔ Test 1 Passed: Product added to user cart');

  // Test 2: Add same product increments existing quantity
  const cartAfterSecondAdd = await cartService.addToCart(userId, { productId: product.id, quantity: 1 });
  assert.strictEqual(cartAfterSecondAdd.items.length, 1, 'Should not create duplicate cart rows');
  assert.strictEqual(cartAfterSecondAdd.items[0].quantity, 3);
  console.log('✔ Test 2 Passed: Duplicate product addition correctly increments quantity');

  // Test 3: Reject quantity exceeding available stock
  let excessStockFailed = false;
  try {
    await cartService.addToCart(userId, { productId: product.id, quantity: 99999 });
  } catch (err) {
    excessStockFailed = true;
    assert.strictEqual(err.statusCode, 400);
  }
  assert.ok(excessStockFailed, 'Cart must reject quantity beyond available stock');
  console.log('✔ Test 3 Passed: Insufficient stock rejected');

  // Test 4: Update cart item quantity
  const cartItemId = cartAfterSecondAdd.items[0].id;
  const cartAfterUpdate = await cartService.updateCartItem(userId, cartItemId, 1);
  assert.strictEqual(cartAfterUpdate.items[0].quantity, 1);
  console.log('✔ Test 4 Passed: Cart item quantity successfully updated');

  // Test 5: Remove cart item
  const cartAfterRemove = await cartService.removeCartItem(userId, cartItemId);
  assert.strictEqual(cartAfterRemove.items.length, 0);
  console.log('✔ Test 5 Passed: Cart item removed');

  console.log('✔ Cart test suite passed.\n');
}

if (require.main === module) {
  testCart().then(() => db.end()).catch(err => {
    console.error('Cart test failed:', err);
    process.exit(1);
  });
}

module.exports = testCart;

