const express = require('express');
const router = express.Router();
const wishlistController = require('./wishlistController');
const { protect } = require('../../middleware/authMiddleware');

router.use(protect);

router.get('/', wishlistController.getWishlist);
router.post('/', wishlistController.addToWishlist);
router.delete('/:productId', wishlistController.removeFromWishlist);
router.post('/move-to-cart/:productId', wishlistController.moveToCart);

module.exports = router;
