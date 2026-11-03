const express = require('express');
const router = express.Router();
const { getPayments, createPayment } = require('../controllers/paymentController');
const { protect } = require('../middleware/auth');

router.get('/', protect, getPayments);
router.post('/', protect, createPayment);

module.exports = router;

