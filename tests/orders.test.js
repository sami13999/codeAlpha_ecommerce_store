const assert = require('assert');
const cartService = require('../backend/src/modules/cart/cartService');
const orderService = require('../backend/src/modules/orders/orderService');
const db = require('../backend/src/config/database');

async function testOrders() {
  console.log('--- RUNNING ORDERS & TRANSACTION TESTS ---');

  const [users] = await db.query('SELECT id FROM users WHERE email = ? LIMIT 1', ['customer@example.com']);
  const userId = users[0].id;

  await cartService.clearCart(userId);

  // 1. Empty cart checkout fails
  let emptyFailed = false;
  try {
    await orderService.checkout(userId, {
      shipping_name: 'Test Customer',
      shipping_phone: '+92 300 1234567',
      shipping_address_line1: 'Test Line 1',
      shipping_city: 'Islamabad'
    });
  } catch (err) {
    emptyFailed = true;
    assert.strictEqual(err.statusCode, 400);
  }
  assert.ok(emptyFailed);
  console.log('✔ Test 1: Empty cart checkout rejected');

  // 2. Add product & checkout with coupon (subtotal >= 1000)
  const [prods] = await db.query('SELECT id, name, price, stock_quantity FROM products WHERE is_active = 1 AND stock_quantity >= 6 LIMIT 1');
  const targetProduct = prods[0];
  const originalStock = targetProduct.stock_quantity;
  const buyQty = 4; // Ensures subtotal exceeds 1000 for WELCOME10 coupon

  await cartService.addToCart(userId, { productId: targetProduct.id, quantity: buyQty });

  const orderResult = await orderService.checkout(userId, {
    shipping_name: 'Sami Master Test',
    shipping_phone: '+92 300 1234567',
    shipping_address_line1: 'House 50, Architectural Way',
    shipping_city: 'Lahore',
    coupon_code: 'WELCOME10',
    customer_note: 'Handle with care'
  });

  assert.ok(orderResult.id);
  assert.ok(orderResult.order_number.startsWith('ORD-'));
  assert.strictEqual(orderResult.payment_method, 'COD');
  assert.strictEqual(orderResult.order_status, 'PENDING');
  assert.ok(orderResult.discount_amount > 0, 'Discount must be deducted');
  console.log(`✔ Test 2: Transactional checkout with coupon executed (${orderResult.order_number})`);

  // 3. Stock deducted & inventory movement verified
  const [afterStock] = await db.query('SELECT stock_quantity FROM products WHERE id = ?', [targetProduct.id]);
  assert.strictEqual(afterStock[0].stock_quantity, originalStock - buyQty);

  const [invRows] = await db.query(
    'SELECT * FROM inventory_movements WHERE reference_id = ? AND product_id = ?',
    [orderResult.id, targetProduct.id]
  );
  assert.ok(invRows.length > 0);
  assert.strictEqual(invRows[0].movement_type, 'ORDER');
  console.log('✔ Test 3: Stock decremented & inventory movement logged');

  // 4. Cart cleared
  const cartAfter = await cartService.getUserCart(userId);
  assert.strictEqual(cartAfter.items.length, 0);
  console.log('✔ Test 4: User shopping bag cleared post-checkout');

  // 5. Order Cancellation & Stock Restoration
  await orderService.cancelOrder(userId, orderResult.id);
  const [restoredStock] = await db.query('SELECT stock_quantity FROM products WHERE id = ?', [targetProduct.id]);
  assert.strictEqual(restoredStock[0].stock_quantity, originalStock, 'Stock must be restored on cancellation');

  const cancelledOrder = await orderService.getOrderById(userId, orderResult.id);
  assert.strictEqual(cancelledOrder.order_status, 'CANCELLED');
  console.log('✔ Test 5: Order cancelled & inventory automatically restored');

  // Clean test coupon usage for test repeatability
  await db.query('DELETE FROM coupon_usages WHERE user_id = ?', [userId]);

  console.log('✔ Orders suite passed.\n');
}

if (require.main === module) {
  testOrders().then(() => db.end()).catch(err => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = testOrders;
