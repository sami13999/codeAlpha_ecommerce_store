const express = require('express');
const router = express.Router();
const userController = require('./userController');
const { protect } = require('../../middleware/authMiddleware');

router.use(protect);

router.get('/profile', userController.getProfile);
router.put('/profile', userController.updateProfile);
router.put('/change-password', userController.changePassword);

module.exports = router;
