const Product = require('../models/Product');
const Brand = require('../models/Brand');
const Category = require('../models/Category');
const StockTransaction = require('../models/StockTransaction');

// @desc    Get all products with search, brand, category, low stock filters
// @route   GET /api/products
exports.getProducts = async (req, res) => {
  try {
    const { brand, category, search, lowStockOnly, sort = 'name', order = 'asc', page = 1, limit = 50 } = req.query;

    const query = { active: true };
    if (brand && brand !== 'All') query.brand = brand;
    if (category && category !== 'All') query.category = category;

    if (search && search.trim()) {
      const s = search.trim();
      query.$or = [
        { name: new RegExp(s, 'i') },
        { sku: new RegExp(s, 'i') },
        { brand: new RegExp(s, 'i') },
        { category: new RegExp(s, 'i') }
      ];
    }

    if (lowStockOnly === 'true') {
      query.$expr = { $lte: ['$currentStock', '$minStockAlert'] };
    }

    const sortObj = {};
    sortObj[sort] = order === 'desc' ? -1 : 1;

    const total = await Product.countDocuments(query);
    const products = await Product.find(query)
      .sort(sortObj)
      .skip((page - 1) * limit)
      .limit(Number(limit));

    // Valuation & Stock summary
    const all = await Product.find({ active: true }).select('currentStock purchaseRate sellingRate minStockAlert totalSoldQty totalSalesValue');
    let totalStockUnits = 0;
    let purchaseValuation = 0;
    let sellingValuation = 0;
    let lowStockCount = 0;

    all.forEach(p => {
      const stock = p.currentStock || 0;
      totalStockUnits += stock;
      purchaseValuation += stock * (p.purchaseRate || 0);
      sellingValuation += stock * (p.sellingRate || 0);
      if (stock <= (p.minStockAlert || 20)) lowStockCount++;
    });

    res.json({
      success: true,
      data: products,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / limit) || 1
      },
      summary: {
        totalProducts: all.length,
        totalStockUnits,
        purchaseValuation: Math.round(purchaseValuation),
        sellingValuation: Math.round(sellingValuation),
        potentialProfit: Math.round(sellingValuation - purchaseValuation),
        lowStockCount
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc    Item & Brand Performance Matrix
// @route   GET /api/products/matrix
exports.getItemBrandMatrix = async (req, res) => {
  try {
    const { brand, category, search } = req.query;
    const query = { active: true };
    if (brand && brand !== 'All') query.brand = brand;
    if (category && category !== 'All') query.category = category;

    if (search && search.trim()) {
      const s = search.trim();
      query.$or = [
        { name: new RegExp(s, 'i') },
        { sku: new RegExp(s, 'i') }
      ];
    }

    const products = await Product.find(query).sort({ totalSalesValue: -1 });

    const matrix = products.map(p => {
      const totalCost = (p.totalSoldQty || 0) * (p.purchaseRate || 0);
      const profit = Math.max(0, (p.totalSalesValue || 0) - totalCost);
      const marginPct = p.totalSalesValue > 0 ? ((profit / p.totalSalesValue) * 100).toFixed(1) : 0;

      return {
        id: p._id,
        name: p.name,
        sku: p.sku,
        brand: p.brand,
        category: p.category,
        totalQuantitySold: p.totalSoldQty || 0,
        totalSalesValue: Math.round(p.totalSalesValue || 0),
        purchaseValue: Math.round(totalCost),
        profitMargin: Math.round(profit),
        marginPercent: Number(marginPct),
        currentStock: p.currentStock || 0,
        stockStatus: (p.currentStock || 0) <= (p.minStockAlert || 20) ? 'Low Stock' : 'Adequate',
        unit: p.unit
      };
    });

    res.json({ success: true, data: matrix });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc    Create new product
// @route   POST /api/products
exports.createProduct = async (req, res) => {
  try {
    const { name, sku, brand, category, unit, purchaseRate, sellingRate, mrp, gstRate, currentStock, minStockAlert, expiryDate } = req.body;

    const existing = await Product.findOne({ sku: sku.toUpperCase().trim() });
    if (existing) {
      return res.status(400).json({ success: false, message: `SKU ${sku} already exists` });
    }

    const product = await Product.create({
      name,
      sku: sku.toUpperCase().trim(),
      brand,
      category,
      unit: unit || 'PCS',
      purchaseRate: Number(purchaseRate) || 0,
      sellingRate: Number(sellingRate) || 0,
      mrp: Number(mrp) || 0,
      gstRate: Number(gstRate) || 18,
      currentStock: Number(currentStock) || 0,
      minStockAlert: Number(minStockAlert) || 20,
      expiryDate: expiryDate ? new Date(expiryDate) : null
    });

    if (Number(currentStock) > 0) {
      await StockTransaction.create({
        type: 'IN',
        product: product._id,
        productName: product.name,
        sku: product.sku,
        qty: Number(currentStock),
        prevStock: 0,
        newStock: Number(currentStock),
        rate: Number(purchaseRate) || 0,
        total: Number(currentStock) * (Number(purchaseRate) || 0),
        remarks: 'Opening stock entry',
        performedBy: req.user ? req.user.name : 'Inventory Manager'
      });
    }

    res.status(201).json({ success: true, message: 'Product created successfully', data: product });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc    Update product
// @route   PUT /api/products/:id
exports.updateProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
    res.json({ success: true, message: 'Product updated successfully', data: product });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc    Adjust stock (IN / OUT / DAMAGE / ADJUSTMENT)
// @route   POST /api/products/:id/adjust-stock
exports.adjustStock = async (req, res) => {
  try {
    const { type = 'ADJUSTMENT', qty, remarks, referenceNo } = req.body;
    const adjustQty = Number(qty);

    if (!adjustQty || adjustQty === 0) {
      return res.status(400).json({ success: false, message: 'Adjustment quantity cannot be 0' });
    }

    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });

    const prevStock = product.currentStock;
    const newStock = Math.max(0, prevStock + adjustQty);
    product.currentStock = newStock;
    await product.save();

    const transaction = await StockTransaction.create({
      type,
      product: product._id,
      productName: product.name,
      sku: product.sku,
      qty: adjustQty,
      prevStock,
      newStock,
      rate: product.purchaseRate || 0,
      total: Math.abs(adjustQty) * (product.purchaseRate || 0),
      referenceNo,
      remarks,
      performedBy: req.user ? req.user.name : 'Inventory Manager'
    });

    res.json({
      success: true,
      message: `Stock adjusted by ${adjustQty > 0 ? '+' : ''}${adjustQty}. New Stock: ${newStock}`,
      product,
      transaction
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc    Get Stock Transactions history
// @route   GET /api/products/transactions
exports.getStockTransactions = async (req, res) => {
  try {
    const { type, page = 1, limit = 50 } = req.query;
    const query = {};
    if (type && type !== 'All') query.type = type;

    const total = await StockTransaction.countDocuments(query);
    const transactions = await StockTransaction.find(query)
      .sort({ date: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.json({
      success: true,
      data: transactions,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / limit) || 1
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc    Brands & Categories CRUD
exports.getBrands = async (req, res) => {
  const brands = await Brand.find({ active: true }).sort({ name: 1 });
  res.json({ success: true, data: brands });
};

exports.createBrand = async (req, res) => {
  const brand = await Brand.create(req.body);
  res.status(201).json({ success: true, data: brand });
};

exports.getCategories = async (req, res) => {
  const categories = await Category.find({ active: true }).sort({ name: 1 });
  res.json({ success: true, data: categories });
};

exports.createCategory = async (req, res) => {
  const category = await Category.create(req.body);
  res.status(201).json({ success: true, data: category });
};

