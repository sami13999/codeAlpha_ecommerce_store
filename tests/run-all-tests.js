const testAuth = require('./auth.test');
const testProducts = require('./products.test');
const testCart = require('./cart.test');
const testOrders = require('./orders.test');
const db = require('../server/config/db');

async function runAll() {
  console.log('====================================================');
  console.log('       MASTER TEST RUNNER - E-COMMERCE MVP          ');
  console.log('====================================================\n');
  const start = Date.now();

  try {
    await testAuth();
    await testProducts();
    await testCart();
    await testOrders();

    const elapsed = ((Date.now() - start) / 1000).toFixed(2);
    console.log('====================================================');
    console.log(` ALL TEST SUITES PASSED IN ${elapsed}s! `);
    console.log('====================================================');
  } catch (err) {
    console.error('\n❌ TEST SUITE RUN FAILED:');
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

