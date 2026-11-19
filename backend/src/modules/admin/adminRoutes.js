const express = require('express');
const { protect, authorize } = require('../../middleware/authMiddleware');

// Sub-controllers
const dashboardController = require('./dashboard/dashboardController');
const productController = require('./products/adminProductController');
const categoryController = require('./categories/adminCategoryController');
const orderController = require('./orders/adminOrderController');
const customerController = require('./customers/adminCustomerController');
const inventoryController = require('./inventory/adminInventoryController');
const couponController = require('./coupons/adminCouponController');
const reviewController = require('./reviews/adminReviewController');
const newsletterController = require('./newsletter/adminNewsletterController');
const reportsController = require('./reports/adminReportsController');
const settingsController = require('./settings/adminSettingsController');

const router = express.Router();

// Enforce authentication & strict ADMIN authorization across ALL admin endpoints
router.use(protect);
router.use(authorize('ADMIN'));

// 1. Dashboard
router.get('/dashboard', dashboardController.getOverview);
router.get('/dashboard/trends', dashboardController.getTrends);

// 2. Products
router.get('/products', productController.list);
router.post('/products', productController.create);
router.get('/products/:id', productController.getById);
router.put('/products/:id', productController.update);
router.delete('/products/:id', productController.delete);
router.patch('/products/:id/toggle-status', productController.toggleStatus);

// 3. Categories
router.get('/categories', categoryController.list);
router.post('/categories', categoryController.create);
router.get('/categories/:id', categoryController.getById);
router.put('/categories/:id', categoryController.update);
router.delete('/categories/:id', categoryController.delete);

// 4. Orders
router.get('/orders', orderController.list);
router.get('/orders/:id', orderController.getById);
router.patch('/orders/:id/status', orderController.updateStatus);
router.patch('/orders/:id/payment', orderController.updatePayment);

// 5. Customers
router.get('/customers', customerController.list);
router.get('/customers/:id', customerController.getById);
router.patch('/customers/:id/status', customerController.updateStatus);

// 6. Inventory
router.get('/inventory', inventoryController.list);
router.post('/inventory/adjust', inventoryController.adjust);
router.post('/inventory/:id/adjust', inventoryController.adjust);
router.get('/inventory/movements', inventoryController.movements);

// 7. Coupons
router.get('/coupons', couponController.list);
router.post('/coupons', couponController.create);
router.get('/coupons/:id', couponController.getById);
router.put('/coupons/:id', couponController.update);
router.patch('/coupons/:id/toggle-status', couponController.toggleStatus);

// 8. Reviews
router.get('/reviews', reviewController.list);
router.patch('/reviews/:id/status', reviewController.updateStatus);

// 9. Newsletter
router.get('/newsletter', newsletterController.list);
router.get('/newsletter/export-csv', newsletterController.exportCsv);

// 10. Reports
router.get('/reports/sales', reportsController.salesReport);
router.get('/reports/products', reportsController.productReport);
router.get('/reports/customers', reportsController.customerReport);
router.get('/reports/sales/csv', reportsController.exportSalesCsv);

// 11. Store Settings
router.get('/settings', settingsController.get);
router.put('/settings', settingsController.update);

module.exports = router;
