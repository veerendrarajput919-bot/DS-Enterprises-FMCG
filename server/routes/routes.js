const express = require('express');
const router = express.Router();
const {
  getRoutes,
  getBeats,
  getStaff,
  assignStaffToRoute,
  getVisits,
  recordVisit
} = require('../controllers/routeController');
const { protect } = require('../middleware/auth');

router.get('/beats', protect, getBeats);
router.get('/staff', protect, getStaff);
router.get('/visits', protect, getVisits);
router.post('/visits', protect, recordVisit);
router.post('/:id/assign', protect, assignStaffToRoute);
router.get('/', protect, getRoutes);

module.exports = router;

