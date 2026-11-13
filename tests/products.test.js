const assert = require('assert');
const productService = require('../server/services/productService');
const db = require('../server/config/db');

async function testProducts() {
  console.log('--- RUNNING PRODUCTS TESTS ---');

  // Test 1: Get Products with Pagination
  const result = await productService.getProducts({ page: 1, limit: 10 });
  assert.ok(Array.isArray(result.products), 'Products must be an array');
  assert.ok(result.products.length > 0, 'Should return products');
  assert.strictEqual(result.pagination.limit, 10);
  assert.ok(result.pagination.total >= 50, 'Total products should be >= 50');
  console.log(`✔ Test 1 Passed: Pagination works (${result.products.length} products on page 1 of ${result.pagination.totalPages})`);

  // Test 2: Search Products
  const searchResult = await productService.getProducts({ search: 'Watch' });
  assert.ok(searchResult.products.length > 0, 'Search for "Watch" should return matching products');
  const matchedAll = searchResult.products.every(p => 
    p.name.toLowerCase().includes('watch') || 
    (p.short_description && p.short_description.toLowerCase().includes('watch')) ||
    (p.brand && p.brand.toLowerCase().includes('watch'))
  );
  assert.ok(matchedAll, 'All searched products must match query criteria');
  console.log(`✔ Test 2 Passed: Search filtering returned ${searchResult.products.length} results`);

  // Test 3: Get Product By Valid Slug
  const firstProd = result.products[0];
  const detail = await productService.getProductBySlug(firstProd.slug);
  assert.strictEqual(detail.id, firstProd.id);
  assert.ok(Array.isArray(detail.images), 'Product detail must include images array');
  assert.ok(Array.isArray(detail.related_products), 'Product detail must include related products');
  console.log(`✔ Test 3 Passed: Product detail by slug ("${firstProd.slug}")`);

  // Test 4: Invalid Slug Throws 404
  let invalidSlugFailed = false;
  try {
    await productService.getProductBySlug('non-existent-product-slug-xyz-999');
  } catch (err) {
    invalidSlugFailed = true;
    assert.strictEqual(err.statusCode, 404);
  }
  assert.ok(invalidSlugFailed, 'Non-existent slug must reject with 404');
  console.log('✔ Test 4 Passed: Non-existent slug returns 404');

  // Test 5: Categories Hierarchy
  const categories = await productService.getCategories();
  assert.ok(categories.all.length > 0, 'Should return categories');
  assert.ok(categories.tree.length > 0, 'Should build categories tree');
  console.log(`✔ Test 5 Passed: Categories tree returned (${categories.all.length} categories, ${categories.tree.length} root branches)`);

  console.log('✔ Products test suite passed.\n');
}

if (require.main === module) {
  testProducts().then(() => db.end()).catch(err => {
    console.error('Products test failed:', err);
    process.exit(1);
  });
}

module.exports = testProducts;

