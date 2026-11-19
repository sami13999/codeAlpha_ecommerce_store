const assert = require('assert');
const couponService = require('../backend/src/modules/coupons/couponService');
const db = require('../backend/src/config/database');

async function testCoupons() {
  console.log('--- RUNNING COUPON TESTS ---');

  const [users] = await db.query('SELECT id FROM users WHERE email = ? LIMIT 1', ['customer@example.com']);
  const userId = users[0].id;

  await db.query('DELETE FROM coupon_usages WHERE user_id = ?', [userId]);

  // 1. Validate Percentage Coupon (WELCOME10: 10% off, min order 1000)
  const res1 = await couponService.validateCoupon(userId, 'WELCOME10', 2000.00);
  assert.strictEqual(res1.valid, true);
  assert.strictEqual(res1.discount_amount, 200.00);
  assert.strictEqual(res1.subtotal_after_discount, 1800.00);
  console.log('✔ Test 1: Percentage coupon calculation (10% of 2000 = 200)');

  // 2. Reject Minimum Order Threshold
  let minOrderFailed = false;
  try {
    await couponService.validateCoupon(userId, 'WELCOME10', 500.00);
  } catch (err) {
    minOrderFailed = true;
    assert.strictEqual(err.statusCode, 400);
  }
  assert.ok(minOrderFailed, 'Minimum order threshold must be enforced');
  console.log('✔ Test 2: Minimum order amount enforced');

  // 3. Reject Invalid Coupon Code
  let invalidCodeFailed = false;
  try {
    await couponService.validateCoupon(userId, 'NONEXISTENTCODE999', 5000.00);
  } catch (err) {
    invalidCodeFailed = true;
    assert.strictEqual(err.statusCode, 404);
  }
  assert.ok(invalidCodeFailed, 'Invalid coupon must reject with 404');
  console.log('✔ Test 3: Invalid coupon rejected (404)');

  console.log('✔ Coupons suite passed.\n');
}

if (require.main === module) {
  testCoupons().then(() => db.end()).catch(err => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = testCoupons;

