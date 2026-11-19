const assert = require('assert');
const authService = require('../backend/src/modules/auth/authService');
const db = require('../backend/src/config/database');

async function testAuth() {
  console.log('--- RUNNING AUTH TESTS ---');
  const testEmail = `testuser_${Date.now()}@example.com`;
  const testPassword = 'Password123!';

  // Test 1: Register
  const regResult = await authService.register({
    full_name: 'Auth Test Runner',
    email: testEmail,
    password: testPassword,
    phone: `+92300${Math.floor(1000000 + Math.random() * 9000000)}`
  });
  assert.ok(regResult.token, 'Token generated');
  assert.strictEqual(regResult.user.role, 'CUSTOMER');
  console.log('✔ Test 1: Customer registration successful');

  // Test 2: Duplicate email
  let dupRejected = false;
  try {
    await authService.register({
      full_name: 'Dup Guy',
      email: testEmail,
      password: testPassword
    });
  } catch (err) {
    dupRejected = true;
    assert.strictEqual(err.statusCode, 409);
  }
  assert.ok(dupRejected, 'Duplicate email must be rejected');
  console.log('✔ Test 2: Duplicate email blocked (409 Conflict)');

  // Test 3: Login
  const loginRes = await authService.login({
    email: testEmail,
    password: testPassword
  });
  assert.ok(loginRes.token);
  assert.strictEqual(loginRes.user.password_hash, undefined);
  console.log('✔ Test 3: Login successful, password hash omitted');

  // Cleanup
  await db.query('DELETE FROM users WHERE id = ?', [regResult.user.id]);
  console.log('✔ Auth suite passed & test user cleaned up.\n');
}

if (require.main === module) {
  testAuth().then(() => db.end()).catch(err => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = testAuth;
