const testAuth = require('./auth.test');
const testProducts = require('./products.test');
const testCart = require('./cart.test');
const testWishlist = require('./wishlist.test');
const testAddresses = require('./addresses.test');
const testCoupons = require('./coupons.test');
const testOrders = require('./orders.test');
const testAdmin = require('./admin.test');
const db = require('../backend/src/config/database');

async function runAll() {
  console.log('====================================================');
  console.log('   ENTERPRISE E-COMMERCE MASTER TEST RUNNER         ');
  console.log('====================================================\n');
  const start = Date.now();

  try {
    await testAuth();
    await testProducts();
    await testCart();
    await testWishlist();
    await testAddresses();
    await testCoupons();
    await testOrders();
    await testAdmin();

    const elapsed = ((Date.now() - start) / 1000).toFixed(2);
    console.log('====================================================');
    console.log(` ALL 8 TEST SUITES PASSED CLEANLY IN ${elapsed}s! `);
    console.log('====================================================');
  } catch (err) {
    console.error('\n❌ MASTER TEST RUN FAILED:');
    console.error(err);
    process.exit(1);
  } finally {
    await db.end();
  }
}

if (require.main === module) {
  runAll();
}

module.exports = runAll;

