const assert = require('assert');
const cartService = require('../backend/src/modules/cart/cartService');
const db = require('../backend/src/config/database');

async function testCart() {
  console.log('--- RUNNING CART TESTS ---');

  const [users] = await db.query('SELECT id FROM users WHERE email = ? LIMIT 1', ['customer@example.com']);
  assert.ok(users.length > 0, 'Seed customer must exist');
  const userId = users[0].id;

  await cartService.clearCart(userId);

  const [prods] = await db.query('SELECT id, name, price, stock_quantity FROM products WHERE is_active = 1 AND stock_quantity > 5 LIMIT 1');
  assert.ok(prods.length > 0, 'In-stock product must exist');
  const product = prods[0];

  // 1. Add to cart
  const cart1 = await cartService.addToCart(userId, { productId: product.id, quantity: 2 });
  assert.strictEqual(cart1.items.length, 1);
  assert.strictEqual(cart1.items[0].quantity, 2);
  console.log('✔ Test 1: Item added to shopping bag');

  // 2. Increment on duplicate add
  const cart2 = await cartService.addToCart(userId, { productId: product.id, quantity: 1 });
  assert.strictEqual(cart2.items.length, 1);
  assert.strictEqual(cart2.items[0].quantity, 3);
  console.log('✔ Test 2: Quantity incremented on duplicate add');

  // 3. Excess stock rejected
  let excessFailed = false;
  try {
    await cartService.addToCart(userId, { productId: product.id, quantity: 99999 });
  } catch (err) {
    excessFailed = true;
    assert.strictEqual(err.statusCode, 400);
  }
  assert.ok(excessFailed, 'Excess quantity must fail');
  console.log('✔ Test 3: Insufficient stock rejected (400)');

  // 4. Update quantity
  const cartItemId = cart2.items[0].id;
  const cart3 = await cartService.updateCartItem(userId, cartItemId, 1);
  assert.strictEqual(cart3.items[0].quantity, 1);
  console.log('✔ Test 4: Quantity updated');

  // 5. Remove item
  const cart4 = await cartService.removeCartItem(userId, cartItemId);
  assert.strictEqual(cart4.items.length, 0);
  console.log('✔ Test 5: Item removed from bag');

  console.log('✔ Cart suite passed.\n');
}

if (require.main === module) {
  testCart().then(() => db.end()).catch(err => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = testCart;

