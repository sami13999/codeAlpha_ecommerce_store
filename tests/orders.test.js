const assert = require('assert');
const cartService = require('../server/services/cartService');
const orderService = require('../server/services/orderService');
const db = require('../server/config/db');

async function testOrders() {
  console.log('--- RUNNING ORDER & TRANSACTION TESTS ---');

  // Customer 1
  const [custRows] = await db.query('SELECT id FROM users WHERE email = ? LIMIT 1', ['customer@example.com']);
  const userId = custRows[0].id;

  // Clear cart
  await cartService.clearCart(userId);

  // Test 1: Checkout with empty cart should fail
  let emptyCartFailed = false;
  try {
    await orderService.checkout(userId, {
      shipping_name: 'Test Customer',
      shipping_phone: '+923001234567',
      shipping_address_line1: '123 Test St',
      shipping_city: 'Lahore'
    });
  } catch (err) {
    emptyCartFailed = true;
    assert.strictEqual(err.statusCode, 400);
  }
  assert.ok(emptyCartFailed, 'Checkout must fail when cart is empty');
  console.log('✔ Test 1 Passed: Empty cart checkout rejected');

  // Test 2: Add product and check stock before checkout
  const [prods] = await db.query('SELECT id, name, price, stock_quantity FROM products WHERE is_active = 1 AND stock_quantity >= 5 LIMIT 1');
  const targetProduct = prods[0];
  const originalStock = targetProduct.stock_quantity;
  const buyQty = 2;

  await cartService.addToCart(userId, { productId: targetProduct.id, quantity: buyQty });

  // Test 3: Transactional Checkout Execution
  const orderResult = await orderService.checkout(userId, {
    shipping_name: 'Sami Customer',
    shipping_phone: '+923001234567',
    shipping_address_line1: 'House 42, Architectural Boulevard',
    shipping_city: 'Islamabad',
    shipping_country: 'Pakistan',
    customer_note: 'Please deliver after 2 PM'
  });

  assert.ok(orderResult.id, 'Order must have an ID');
  assert.ok(orderResult.order_number.startsWith('ORD-'), 'Order number format check');
  assert.strictEqual(orderResult.payment_method, 'COD');
  assert.strictEqual(orderResult.order_status, 'PENDING');
  console.log(`✔ Test 2 Passed: Transactional COD Checkout executed (Order: ${orderResult.order_number})`);

  // Test 4: Verify stock deduction and inventory movement in DB
  const [afterStockRows] = await db.query('SELECT stock_quantity FROM products WHERE id = ?', [targetProduct.id]);
  const newStock = afterStockRows[0].stock_quantity;
  assert.strictEqual(newStock, originalStock - buyQty, 'Product stock must decrement by purchased quantity');

  const [invRows] = await db.query(
    'SELECT * FROM inventory_movements WHERE reference_id = ? AND product_id = ?',
    [orderResult.id, targetProduct.id]
  );
  assert.ok(invRows.length > 0, 'Inventory movement record must be inserted');
  assert.strictEqual(invRows[0].movement_type, 'ORDER');
  assert.strictEqual(invRows[0].previous_stock, originalStock);
  assert.strictEqual(invRows[0].new_stock, newStock);
  console.log('✔ Test 3 Passed: Stock deducted & inventory movement logged');

  // Test 5: Verify cart was cleared
  const cartAfterOrder = await cartService.getUserCart(userId);
  assert.strictEqual(cartAfterOrder.items.length, 0, 'Cart must be empty after successful order placement');
  console.log('✔ Test 4 Passed: User cart cleared post-checkout');

  // Test 6: Verify order query by ID and ownership
  const fetchedOrder = await orderService.getOrderById(userId, orderResult.id);
  assert.strictEqual(fetchedOrder.id, orderResult.id);
  assert.ok(fetchedOrder.items.length > 0, 'Order items must be populated');
  assert.strictEqual(fetchedOrder.items[0].product_id, targetProduct.id);
  console.log('✔ Test 5 Passed: Customer order history and item details retrieved');

  // Test 7: Unauthorized user cannot view another customer's order
  let unauthorizedAccessBlocked = false;
  try {
    await orderService.getOrderById(999999, orderResult.id);
  } catch (err) {
    unauthorizedAccessBlocked = true;
    assert.strictEqual(err.statusCode, 404);
  }
  assert.ok(unauthorizedAccessBlocked, 'Another customer must not be able to view foreign order');
  console.log('✔ Test 6 Passed: Cross-customer order isolation enforced');

  console.log('✔ Orders test suite passed.\n');
}

if (require.main === module) {
  testOrders().then(() => db.end()).catch(err => {
    console.error('Order test failed:', err);
    process.exit(1);
  });
}

module.exports = testOrders;

