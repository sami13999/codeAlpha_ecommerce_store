const assert = require('assert');
const authService = require('../server/services/authService');
const db = require('../server/config/db');

async function testAuth() {
  console.log('--- RUNNING AUTH TESTS ---');
  const testEmail = `testuser_${Date.now()}@example.com`;
  const testPassword = 'Password123!';

  // Test 1: Successful Registration
  const regResult = await authService.register({
    full_name: 'Test Runner',
    email: testEmail,
    password: testPassword,
    phone: `+92300${Math.floor(1000000 + Math.random() * 9000000)}`
  });
  assert.ok(regResult.token, 'Token must be generated on registration');
  assert.strictEqual(regResult.user.email, testEmail);
  assert.strictEqual(regResult.user.role, 'CUSTOMER', 'Role must always default to CUSTOMER');
  console.log('✔ Test 1 Passed: Successful customer registration');

  // Test 2: Prevent Duplicate Email Registration
  let duplicateFailed = false;
  try {
    await authService.register({
      full_name: 'Duplicate Guy',
      email: testEmail,
      password: 'password123'
    });
  } catch (err) {
    duplicateFailed = true;
    assert.strictEqual(err.statusCode, 409, 'Duplicate email should yield 409 Conflict');
  }
  assert.ok(duplicateFailed, 'Duplicate email registration must be rejected');
  console.log('✔ Test 2 Passed: Duplicate email blocked');

  // Test 3: Successful Login
  const loginResult = await authService.login({
    email: testEmail,
    password: testPassword
  });
  assert.ok(loginResult.token, 'Token must be returned on valid login');
  assert.strictEqual(loginResult.user.id, regResult.user.id);
  assert.strictEqual(loginResult.user.password_hash, undefined, 'Password hash must never be returned');
  console.log('✔ Test 3 Passed: Valid login & JWT issue');

  // Test 4: Invalid Password Rejection
  let invalidPassFailed = false;
  try {
    await authService.login({
      email: testEmail,
      password: 'WrongPassword999'
    });
  } catch (err) {
    invalidPassFailed = true;
    assert.strictEqual(err.statusCode, 401);
  }
  assert.ok(invalidPassFailed, 'Invalid password must be rejected');
  console.log('✔ Test 4 Passed: Invalid password rejected');

  // Cleanup test user
  await db.query('DELETE FROM users WHERE id = ?', [regResult.user.id]);
  console.log('✔ Auth test suite passed and cleaned up.\n');
}

if (require.main === module) {
  testAuth().then(() => db.end()).catch(err => {
    console.error('Auth test failed:', err);
    process.exit(1);
  });
}

module.exports = testAuth;

