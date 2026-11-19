const assert = require('assert');
const addressService = require('../backend/src/modules/addresses/addressService');
const db = require('../backend/src/config/database');

async function testAddresses() {
  console.log('--- RUNNING ADDRESSES TESTS ---');

  const [users] = await db.query('SELECT id FROM users WHERE email = ? LIMIT 1', ['customer@example.com']);
  const userId = users[0].id;

  // 1. Create Address
  const addr1 = await addressService.createAddress(userId, {
    full_name: 'Sami Address Test',
    phone: '+92 300 1122334',
    address_line1: 'Apartment 4B, Sector F-8/1',
    city: 'Islamabad',
    state: 'Federal',
    postal_code: '44000',
    country: 'Pakistan',
    is_default: 1
  });
  assert.ok(addr1.id);
  assert.strictEqual(addr1.is_default, 1);
  console.log('✔ Test 1: Address created and set as default');

  // 2. Fetch User Addresses
  const list = await addressService.getUserAddresses(userId);
  assert.ok(list.length > 0);
  console.log(`✔ Test 2: User addresses retrieved (${list.length} address)`);

  // 3. Update Address
  const updated = await addressService.updateAddress(userId, addr1.id, {
    full_name: 'Sami Address Test Updated',
    phone: '+92 300 9988776',
    address_line1: 'House 99, Street 12',
    city: 'Islamabad'
  });
  assert.strictEqual(updated.full_name, 'Sami Address Test Updated');
  console.log('✔ Test 3: Address successfully updated');

  // 4. Delete Address
  await addressService.deleteAddress(userId, addr1.id);
  const afterDelete = await addressService.getUserAddresses(userId);
  assert.ok(!afterDelete.some(a => a.id === addr1.id));
  console.log('✔ Test 4: Address deleted successfully');

  console.log('✔ Addresses suite passed.\n');
}

if (require.main === module) {
  testAddresses().then(() => db.end()).catch(err => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = testAddresses;

