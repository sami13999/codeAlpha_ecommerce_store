const assert = require('assert');
const productService = require('../backend/src/modules/products/productService');
const categoryService = require('../backend/src/modules/categories/categoryService');
const db = require('../backend/src/config/database');

async function testProducts() {
  console.log('--- RUNNING PRODUCT & CATEGORY TESTS ---');

  // Test 1: Pagination
  const result = await productService.getProducts({ page: 1, limit: 10 });
  assert.ok(Array.isArray(result.products));
  assert.ok(result.pagination.total >= 50);
  console.log(`✔ Test 1: Products pagination (${result.products.length} products on page 1)`);

  // Test 2: Search
  const searchResult = await productService.getProducts({ search: 'Watch' });
  assert.ok(searchResult.products.length > 0);
  console.log(`✔ Test 2: Search filtering (${searchResult.products.length} matches)`);

  // Test 3: Single by slug
  const firstProd = result.products[0];
  const detail = await productService.getProductBySlug(firstProd.slug);
  assert.strictEqual(detail.id, firstProd.id);
  assert.ok(Array.isArray(detail.images));
  console.log(`✔ Test 3: Slug retrieval with gallery images ("${firstProd.slug}")`);

  // Test 4: Categories tree
  const catTree = await categoryService.getCategories();
  assert.ok(catTree.tree.length > 0);
  console.log(`✔ Test 4: Category hierarchy tree (${catTree.tree.length} root departments)`);

  console.log('✔ Product & category suite passed.\n');
}

if (require.main === module) {
  testProducts().then(() => db.end()).catch(err => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = testProducts;
