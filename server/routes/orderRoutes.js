const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { protect } = require('../middleware/authMiddleware');
const { validate } = require('../middleware/validationMiddleware');
const { validateCheckout } = require('../validators/orderValidator');

// All order endpoints are protected by JWT
router.use(protect);

router.post('/checkout', validate(validateCheckout), orderController.checkout);
router.get('/', orderController.getOrders);
router.get('/:id', orderController.getOrderById);

module.exports = router;

