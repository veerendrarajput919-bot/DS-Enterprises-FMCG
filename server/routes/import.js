const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { previewFile, processImport } = require('../controllers/importController');
const { protect } = require('../middleware/auth');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../uploads'));
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `import_${Date.now()}_${Math.random().toString(36).substring(7)}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 } // 25MB max
});

router.post('/preview', protect, upload.single('file'), previewFile);
router.post('/process', protect, processImport);

module.exports = router;

