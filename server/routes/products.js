const express = require('express');
const router = express.Router();
const {
  getProducts,
  getItemBrandMatrix,
  createProduct,
  updateProduct,
  adjustStock,
  getStockTransactions,
  getBrands,
  createBrand,
  getCategories,
  createCategory
} = require('../controllers/stockController');
const { protect } = require('../middleware/auth');

router.get('/matrix', protect, getItemBrandMatrix);
router.get('/transactions', protect, getStockTransactions);
router.get('/brands', protect, getBrands);
router.post('/brands', protect, createBrand);
router.get('/categories', protect, getCategories);
router.post('/categories', protect, createCategory);

router.get('/', protect, getProducts);
router.post('/', protect, createProduct);
router.put('/:id', protect, updateProduct);
router.post('/:id/adjust-stock', protect, adjustStock);

module.exports = router;

