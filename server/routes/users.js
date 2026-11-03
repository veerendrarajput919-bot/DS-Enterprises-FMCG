const express = require('express');
const router = express.Router();
const {
  getUsers,
  createUser,
  updateUser,
  deleteUser,
  getRoles,
  updateRolePermissions
} = require('../controllers/userController');
const { protect } = require('../middleware/auth');

router.get('/roles', protect, getRoles);
router.put('/roles/:roleName', protect, updateRolePermissions);

router.get('/', protect, getUsers);
router.post('/', protect, createUser);
router.put('/:id', protect, updateUser);
router.delete('/:id', protect, deleteUser);

module.exports = router;

