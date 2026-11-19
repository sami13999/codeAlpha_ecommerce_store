const express = require('express');
const router = express.Router();
const orderController = require('./orderController');
const { protect } = require('../../middleware/authMiddleware');
const { validate } = require('../../middleware/validationMiddleware');
const { validateCheckout } = require('./orderValidator');

router.use(protect);

router.post('/checkout', validate(validateCheckout), orderController.checkout);
router.get('/', orderController.getOrders);
router.get('/:id', orderController.getOrderById);
router.post('/:id/cancel', orderController.cancelOrder);

module.exports = router;
