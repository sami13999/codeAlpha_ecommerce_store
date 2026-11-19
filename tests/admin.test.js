require('dotenv').config();
const assert = require('assert');
const db = require('../backend/src/config/database');
const authService = require('../backend/src/modules/auth/authService');

// Admin Services for direct verification
const dashboardService = require('../backend/src/modules/admin/dashboard/dashboardService');
const adminProductService = require('../backend/src/modules/admin/products/adminProductService');
const adminCategoryService = require('../backend/src/modules/admin/categories/adminCategoryService');
const adminOrderService = require('../backend/src/modules/admin/orders/adminOrderService');
const adminCustomerService = require('../backend/src/modules/admin/customers/adminCustomerService');
const adminInventoryService = require('../backend/src/modules/admin/inventory/adminInventoryService');
const adminCouponService = require('../backend/src/modules/admin/coupons/adminCouponService');
const adminReportsService = require('../backend/src/modules/admin/reports/adminReportsService');
const app = require('../backend/src/app');
const adminSettingsService = require('../backend/src/modules/admin/settings/adminSettingsService');

const BASE_URL = 'http://localhost:5000';

async function testAdmin() {
  console.log('--- RUNNING ADMIN DASHBOARD TEST SUITE ---');

  let testServer = null;
  try {
    await fetch(`${BASE_URL}/api/health`);
  } catch (e) {
    // Port 5000 not running, start app listener for the test
    testServer = await new Promise((resolve) => {
      const s = app.listen(5000, () => resolve(s));
    });
  }

  try {
    const adminToken = authService.generateToken({ id: 2, email: 'admin@store.com', role: 'ADMIN' });
  const customerToken = authService.generateToken({ id: 1, email: 'customer@store.com', role: 'CUSTOMER' });

  // Initial cleanup of any stale test artifacts
  await db.query(`DELETE FROM inventory_movements WHERE product_id IN (SELECT id FROM products WHERE sku LIKE 'SKU-ADM%' OR slug LIKE 'test-prod-%')`);
  await db.query(`DELETE FROM product_images WHERE product_id IN (SELECT id FROM products WHERE sku LIKE 'SKU-ADM%' OR slug LIKE 'test-prod-%')`);
  await db.query(`DELETE FROM products WHERE sku LIKE 'SKU-ADM%' OR slug LIKE 'test-prod-%'`);
  await db.query(`DELETE FROM categories WHERE slug LIKE 'test-cat%'`);
  await db.query(`DELETE FROM coupons WHERE code LIKE 'PROMO%'`);

  // 1. RBAC HTTP Verification
  console.log('[RBAC] Verifying role-based access control via HTTP...');
  
  // Unauthenticated -> 401
  const resNoAuth = await fetch(`${BASE_URL}/api/admin/dashboard`);
  assert.strictEqual(resNoAuth.status, 401, 'Unauthenticated request must return 401');
  console.log('  ✔ 401 Unauthorized enforced for missing authorization');

  // Non-admin customer -> 403
  const resCustomer = await fetch(`${BASE_URL}/api/admin/dashboard`, {
    headers: { 'Authorization': `Bearer ${customerToken}` }
  });
  assert.strictEqual(resCustomer.status, 403, 'Customer role must be blocked with 403 Forbidden');
  console.log('  ✔ 403 Forbidden strictly enforced for CUSTOMER role');

  // Admin token -> 200
  const resAdmin = await fetch(`${BASE_URL}/api/admin/dashboard`, {
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  assert.strictEqual(resAdmin.status, 200, 'Admin token must return 200 OK');
  const dashData = await resAdmin.json();
  assert.ok(dashData.data.metrics, 'Dashboard metrics must be present');
  console.log(`  ✔ 200 OK: Metrics verified (Revenue: $${dashData.data.metrics.total_revenue}, Orders: ${dashData.data.metrics.total_orders})`);

  // 2. Categories Service & CRUD
  console.log('[Categories] Testing admin category operations...');
  const catSlug = `test-cat-${Date.now()}`;
  const newCat = await adminCategoryService.createCategory({
    name: 'Admin Test Category',
    slug: catSlug,
    description: 'Created during test'
  });
  assert.ok(newCat.id, 'Category ID created');
  console.log(`  ✔ Created category #${newCat.id}`);

  const updatedCat = await adminCategoryService.updateCategory(newCat.id, {
    name: 'Admin Test Category Updated',
    slug: catSlug
  });
  assert.strictEqual(updatedCat.name, 'Admin Test Category Updated');
  console.log(`  ✔ Updated category #${newCat.id}`);

  // 3. Products Service & ACID Inventory Movements
  console.log('[Products] Testing product creation and ACID stock movement...');
  const testSku = `SKU-ADM-${Date.now()}`;
  const newProd = await adminProductService.createProduct({
    title: 'Admin Test Product Pro',
    slug: `test-prod-${Date.now()}`,
    sku: testSku,
    category_id: newCat.id,
    brand: 'TestLab',
    price: 99.99,
    compare_at_price: 129.99,
    cost_price: 55.00,
    stock_quantity: 30,
    low_stock_threshold: 8,
    is_active: 1,
    is_featured: 1,
    images: [{ image_url: 'https://example.com/item.jpg', is_primary: 1 }]
  }, 2); // Admin ID 2

  assert.ok(newProd.id, 'Product created');
  assert.strictEqual(newProd.stock_quantity, 30);
  console.log(`  ✔ Created product #${newProd.id} with 30 units initial stock`);

  // Verify stock movement was recorded
  const [initialMov] = await db.query(
    'SELECT * FROM inventory_movements WHERE product_id = ? AND movement_type = "STOCK_IN"',
    [newProd.id]
  );
  assert.strictEqual(initialMov.length, 1, 'Initial inventory movement must exist');
  assert.strictEqual(initialMov[0].quantity, 30);
  console.log('  ✔ Initial STOCK_IN audit logged in inventory_movements');

  // Toggle status
  const toggled = await adminProductService.toggleStatus(newProd.id);
  assert.strictEqual(toggled.is_active, 0);
  console.log('  ✔ Toggled product status to inactive');

  // 4. Inventory Stock Adjustments
  console.log('[Inventory] Testing inventory adjust transaction...');
  const adjustResult = await adminInventoryService.adjustStock({
    productId: newProd.id,
    movementType: 'STOCK_IN',
    quantity: 20,
    notes: 'Restock shipment received',
    userId: 2
  });
  assert.strictEqual(adjustResult.new_stock, 50, 'Stock must now be 30 + 20 = 50');
  console.log(`  ✔ Restocked +20 units: New stock = ${adjustResult.new_stock}`);

  const movements = await adminInventoryService.getMovements({ page: 1, limit: 5 });
  assert.ok(movements.movements.length > 0, 'Movements audit log must have records');
  console.log(`  ✔ Movements audit history contains ${movements.movements.length} logged entries`);

  // 5. Orders Management
  console.log('[Orders] Testing order management queries...');
  const ordersList = await adminOrderService.getOrders({ page: 1, limit: 5 });
  assert.ok(Array.isArray(ordersList.orders), 'Orders list must be an array');
  console.log(`  ✔ Retrieved ${ordersList.orders.length} orders from order service`);

  // 6. Customers Dossier
  console.log('[Customers] Testing customer dossier...');
  const customersList = await adminCustomerService.getCustomers({ page: 1, limit: 5 });
  assert.ok(Array.isArray(customersList.customers));
  console.log(`  ✔ Retrieved ${customersList.customers.length} registered customers`);

  // 7. Coupons Management
  console.log('[Coupons] Testing promotional coupon creation...');
  const promoCode = `PROMO${Date.now().toString().slice(-4)}`;
  const createdCoupon = await adminCouponService.createCoupon({
    code: promoCode,
    discount_type: 'PERCENTAGE',
    discount_value: 15,
    min_order_amount: 50,
    usage_limit_total: 50,
    is_active: 1
  });
  assert.ok(createdCoupon.id);
  console.log(`  ✔ Created coupon ${promoCode} (ID: ${createdCoupon.id})`);

  // 8. Reports Intelligence
  console.log('[Reports] Testing sales analytics reporting...');
  const report = await adminReportsService.getSalesReport({
    startDate: '2026-01-01',
    endDate: '2026-12-31'
  });
  assert.ok(report.summary !== undefined);
  console.log(`  ✔ Generated executive sales report (Total Revenue: $${report.summary.total_revenue || 0})`);

  // 9. Store Settings
  console.log('[Settings] Testing store settings read & update...');
  const settings = await adminSettingsService.getSettings();
  assert.ok(settings.store_name !== undefined);
  await adminSettingsService.updateSettings({
    store_name: 'E-Commerce Store Pro',
    currency: 'USD'
  });
  console.log('  ✔ Store settings updated and cache cleared');

  // Clean Up Test Entities
  console.log('[Cleanup] Cleaning up test records...');
  await db.query('DELETE FROM coupons WHERE id = ?', [createdCoupon.id]);
  await db.query('DELETE FROM inventory_movements WHERE product_id = ?', [newProd.id]);
  await db.query('DELETE FROM product_images WHERE product_id = ?', [newProd.id]);
  await db.query('DELETE FROM products WHERE id = ?', [newProd.id]);
  await db.query('DELETE FROM categories WHERE id = ?', [newCat.id]);
  console.log('  ✔ Cleaned up all test records cleanly');

  console.log('✔ Admin Dashboard test suite passed 100% cleanly!\n');
  } finally {
    if (testServer) {
      await new Promise(resolve => testServer.close(resolve));
    }
  }
}

if (require.main === module) {
  testAdmin()
    .then(() => db.end())
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = testAdmin;
