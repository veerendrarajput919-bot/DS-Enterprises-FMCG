const User = require('../models/User');
const Role = require('../models/Role');

// @desc    Get all users
// @route   GET /api/users
exports.getUsers = async (req, res) => {
  try {
    const users = await User.find({}).select('-password').sort({ createdAt: -1 });
    res.json({ success: true, data: users });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc    Create new user / staff member
// @route   POST /api/users
exports.createUser = async (req, res) => {
  try {
    const { name, username, email, password, role, phone, department, permissions } = req.body;

    const existing = await User.findOne({ username: username.toLowerCase().trim() });
    if (existing) {
      return res.status(400).json({ success: false, message: `Username "${username}" is already taken` });
    }

    // Default permissions based on role if not provided
    let userPerms = permissions;
    if (!userPerms) {
      const roleDoc = await Role.findOne({ name: role });
      userPerms = roleDoc ? roleDoc.permissions : {};
    }

    const user = await User.create({
      name,
      username: username.toLowerCase().trim(),
      email,
      password: password || '1234',
      role: role || 'Sales Executive',
      phone,
      department: department || 'General',
      permissions: userPerms
    });

    res.status(201).json({
      success: true,
      message: `User ${name} registered successfully!`,
      data: {
        id: user._id,
        name: user.name,
        username: user.username,
        role: user.role,
        department: user.department,
        permissions: user.permissions
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc    Update user details & permissions
// @route   PUT /api/users/:id
exports.updateUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    user.name = req.body.name || user.name;
    user.email = req.body.email || user.email;
    user.phone = req.body.phone || user.phone;
    user.role = req.body.role || user.role;
    user.department = req.body.department || user.department;
    if (req.body.permissions) user.permissions = req.body.permissions;
    if (typeof req.body.active === 'boolean') user.active = req.body.active;

    if (req.body.password && req.body.password.length >= 4) {
      user.password = req.body.password;
    }

    await user.save();

    res.json({ success: true, message: 'User updated successfully', data: user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc    Delete user
// @route   DELETE /api/users/:id
exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    if (user.username === 'admin') {
      return res.status(400).json({ success: false, message: 'Root admin account cannot be deleted' });
    }
    await User.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'User deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc    Get all roles & permissions matrix
// @route   GET /api/users/roles
exports.getRoles = async (req, res) => {
  try {
    const roles = await Role.find({});
    res.json({ success: true, data: roles });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc    Update role permissions
// @route   PUT /api/users/roles/:roleName
exports.updateRolePermissions = async (req, res) => {
  try {
    const { permissions } = req.body;
    const role = await Role.findOneAndUpdate(
      { name: req.params.roleName },
      { permissions },
      { new: true }
    );
    if (!role) return res.status(404).json({ success: false, message: 'Role not found' });

    // Update all users belonging to this role
    await User.updateMany({ role: role.name }, { permissions });

    res.json({ success: true, message: `Permissions updated for role [${role.name}]`, data: role });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

