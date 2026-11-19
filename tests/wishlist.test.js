const assert = require('assert');
const wishlistService = require('../backend/src/modules/wishlist/wishlistService');
const cartService = require('../backend/src/modules/cart/cartService');
const db = require('../backend/src/config/database');

async function testWishlist() {
  console.log('--- RUNNING WISHLIST TESTS ---');

  const [users] = await db.query('SELECT id FROM users WHERE email = ? LIMIT 1', ['customer@example.com']);
  const userId = users[0].id;

  const [prods] = await db.query('SELECT id, name FROM products WHERE is_active = 1 LIMIT 2');
  const prod1 = prods[0];
  const prod2 = prods[1];

  // 1. Add to wishlist
  const w1 = await wishlistService.addToWishlist(userId, prod1.id);
  assert.ok(w1.items.some(i => i.product_id === prod1.id));
  console.log('✔ Test 1: Added item to wishlist');

  // 2. Prevent duplicate entries
  await wishlistService.addToWishlist(userId, prod1.id);
  const w2 = await wishlistService.getUserWishlist(userId);
  const countProd1 = w2.items.filter(i => i.product_id === prod1.id).length;
  assert.strictEqual(countProd1, 1, 'Duplicate wishlist entries prevented');
  console.log('✔ Test 2: Duplicate wishlist addition prevented');

  // 3. Move to cart
  await cartService.clearCart(userId);
  await wishlistService.moveToCart(userId, prod1.id);
  const w3 = await wishlistService.getUserWishlist(userId);
  const c1 = await cartService.getUserCart(userId);

  assert.ok(!w3.items.some(i => i.product_id === prod1.id), 'Should be removed from wishlist');
  assert.ok(c1.items.some(i => i.product_id === prod1.id), 'Should be present in cart');
  console.log('✔ Test 3: Moved item from wishlist to cart');

  // 4. Remove from wishlist
  await wishlistService.addToWishlist(userId, prod2.id);
  await wishlistService.removeFromWishlist(userId, prod2.id);
  const w4 = await wishlistService.getUserWishlist(userId);
  assert.ok(!w4.items.some(i => i.product_id === prod2.id));
  console.log('✔ Test 4: Removed item from wishlist');

  // Cleanup
  await cartService.clearCart(userId);
  console.log('✔ Wishlist suite passed.\n');
}

if (require.main === module) {
  testWishlist().then(() => db.end()).catch(err => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = testWishlist;

