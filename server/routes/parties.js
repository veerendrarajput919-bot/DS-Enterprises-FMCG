const express = require('express');
const router = express.Router();
const { getParties, getPartyById, createParty, updateParty, deleteParty } = require('../controllers/partyController');
const { protect } = require('../middleware/auth');

router.get('/', protect, getParties);
router.get('/:id', protect, getPartyById);
router.post('/', protect, createParty);
router.put('/:id', protect, updateParty);
router.delete('/:id', protect, deleteParty);

module.exports = router;

