const express = require('express');
const router = express.Router();
const authController = require('./authController');
const { validate } = require('../../middleware/validationMiddleware');
const { protect } = require('../../middleware/authMiddleware');
const { validateRegister, validateLogin } = require('./authValidator');

router.post('/register', validate(validateRegister), authController.register);
router.post('/login', validate(validateLogin), authController.login);
router.post('/logout', authController.logout);
router.get('/me', protect, authController.getProfile);

module.exports = router;
