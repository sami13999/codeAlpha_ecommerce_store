const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');

// Product listing & search
router.get('/', productController.getProducts);

// Categories list
router.get('/categories', productController.getCategories);

// Product details by slug
router.get('/:slug', productController.getProductBySlug);

module.exports = router;

