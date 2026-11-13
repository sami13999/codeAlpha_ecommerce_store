const express = require('express');
const router = express.Router();
const cartController = require('../controllers/cartController');
const { protect } = require('../middleware/authMiddleware');

// All cart operations require authentication
router.use(protect);

router.get('/', cartController.getCart);
router.post('/', cartController.addToCart);
router.put('/:itemId', cartController.updateItem);
router.delete('/:itemId', cartController.removeItem);
router.delete('/', cartController.clearCart);

module.exports = router;

