const Setting = require('../models/Setting');

// @desc    Get company settings
// @route   GET /api/settings
exports.getSettings = async (req, res) => {
  try {
    let setting = await Setting.findOne();
    if (!setting) {
      setting = await Setting.create({
        companyName: 'DS Enterprises',
        tagline: 'FMCG Distribution & Sales System',
        address: 'Transport Nagar, Kanpur, Uttar Pradesh - 208023',
        phone: '+91 98390 12345',
        email: 'support@dsenterprises.in',
        gstin: '09AABCD1234E1Z5',
        adminPin: 'Admin@919'
      });
    }
    res.json({ success: true, data: setting });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc    Update settings
// @route   PUT /api/settings
exports.updateSettings = async (req, res) => {
  try {
    let setting = await Setting.findOne();
    if (!setting) {
      setting = new Setting();
    }
    Object.assign(setting, req.body);
    await setting.save();
    res.json({ success: true, message: 'Settings saved successfully', data: setting });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

