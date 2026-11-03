const express = require('express');
const router = express.Router();
const { filterSales } = require('../controllers/salesAnalyticsController');
const { protect } = require('../middleware/auth');

router.post('/filter', protect, filterSales);

module.exports = router;

