const Purchase = require('../models/Purchase');
const Product = require('../models/Product');
const StockTransaction = require('../models/StockTransaction');

// @desc    Get all purchases
// @route   GET /api/purchases
exports.getPurchases = async (req, res) => {
  try {
    const { search, page = 1, limit = 50 } = req.query;
    const query = {};
    if (search && search.trim()) {
      const s = search.trim();
      query.$or = [
        { purchaseNo: new RegExp(s, 'i') },
        { supplierName: new RegExp(s, 'i') }
      ];
    }

    const total = await Purchase.countDocuments(query);
    const purchases = await Purchase.find(query)
      .sort({ billDate: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const all = await Purchase.find(query).select('grandTotal');
    const totalPurchaseValue = all.reduce((sum, p) => sum + (p.grandTotal || 0), 0);

    res.json({
      success: true,
      data: purchases,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / limit) || 1
      },
      summary: {
        totalPurchases: total,
        totalPurchaseValue: Math.round(totalPurchaseValue)
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc    Record new purchase entry & auto-increment product stock
// @route   POST /api/purchases
exports.createPurchase = async (req, res) => {
  try {
    const { supplierName, billDate, items, notes } = req.body;

    if (!supplierName) return res.status(400).json({ success: false, message: 'Supplier name is required' });
    if (!items || items.length === 0) return res.status(400).json({ success: false, message: 'Purchase must have items' });

    const count = await Purchase.countDocuments();
    const purchaseNo = `PUR-2026-${String(count + 1).padStart(4, '0')}`;

    let subtotal = 0;
    let taxAmount = 0;
    const computedItems = [];

    for (const it of items) {
      const product = await Product.findById(it.productId || it.product);
      const qty = Number(it.qty) || 1;
      const rate = Number(it.rate) || (product ? product.purchaseRate : 100);
      const gstRate = Number(it.gstRate !== undefined ? it.gstRate : (product ? product.gstRate : 18));
      const amount = Math.round(qty * rate);
      const gstAmount = Math.round((amount * gstRate) / 100);
      const itemTotal = amount + gstAmount;

      subtotal += amount;
      taxAmount += gstAmount;

      computedItems.push({
        product: product ? product._id : null,
        productName: product ? product.name : (it.productName || 'Stock Inward Item'),
        sku: product ? product.sku : (it.sku || 'SKU-001'),
        qty,
        unit: product ? product.unit : (it.unit || 'PCS'),
        rate,
        amount,
        gstRate,
        gstAmount,
        total: itemTotal
      });

      // Increment inventory stock
      if (product) {
        const prevStock = product.currentStock;
        product.currentStock = prevStock + qty;
        product.purchaseRate = rate; // Update latest purchase rate
        await product.save();

        await StockTransaction.create({
          type: 'PURCHASE',
          product: product._id,
          productName: product.name,
          sku: product.sku,
          qty,
          prevStock,
          newStock: product.currentStock,
          rate,
          total: itemTotal,
          referenceNo: purchaseNo,
          remarks: `Purchase inward from ${supplierName}`,
          performedBy: req.user ? req.user.name : 'Inventory Manager'
        });
      }
    }

    const grandTotal = subtotal + taxAmount;

    const purchase = await Purchase.create({
      purchaseNo,
      supplierName,
      billDate: billDate ? new Date(billDate) : new Date(),
      items: computedItems,
      subtotal,
      taxAmount,
      grandTotal,
      status: 'Received',
      notes,
      recordedBy: req.user ? req.user.name : 'Inventory Manager'
    });

    res.status(201).json({
      success: true,
      message: `Purchase bill ${purchaseNo} recorded and stock auto-incremented!`,
      data: purchase
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

