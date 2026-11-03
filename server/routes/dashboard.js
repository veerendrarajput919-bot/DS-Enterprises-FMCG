const express = require('express');
const router = express.Router();
const { getMetrics } = require('../controllers/dashboardController');
const { protect } = require('../middleware/auth');

router.get('/metrics', protect, getMetrics);

module.exports = router;

