const Product = require('../models/Product');

// GET /api/products — Customer catalog (C2) + Admin product list (A2)
exports.getAllProducts = async (req, res) => {
  try {
    const { category, activeOnly } = req.query;
    const filter = {};

    if (category) filter.category = category;
    if (activeOnly === 'true') filter.isActive = true;
    // customer app should call ?activeOnly=true; admin panel can see everything

    const products = await Product.find(filter).sort({ name: 1 });
    res.status(200).json({ success: true, count: products.length, data: products });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch products', error: err.message });
  }
};

// GET /api/products/:id — single product detail
exports.getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }
    res.status(200).json({ success: true, data: product });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch product', error: err.message });
  }
};

// POST /api/products — Admin: add new product (A2)
exports.createProduct = async (req, res) => {
  try {
    const { name, price, stock, category, photoUrl, lowStockThreshold } = req.body;

    if (!name || price === undefined) {
      return res.status(400).json({ success: false, message: 'Name and price are required' });
    }

    const product = await Product.create({ name, price, stock, category, photoUrl, lowStockThreshold });
    res.status(201).json({ success: true, data: product });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to create product', error: err.message });
  }
};

// PUT /api/products/:id — Admin: edit product (A2)
exports.updateProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(req.params.id, req.body, {
      new: true,           // return the updated document, not the old one
      runValidators: true  // re-apply schema validation (e.g. price min:0)
    });

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }
    res.status(200).json({ success: true, data: product });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update product', error: err.message });
  }
};

// DELETE /api/products/:id — Admin: remove product
exports.deleteProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }
    res.status(200).json({ success: true, message: 'Product deleted', data: product });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to delete product', error: err.message });
  }
};

// PATCH /api/products/:id/stock — quick stock adjustment (restocking, separate from full edit)
exports.adjustStock = async (req, res) => {
  try {
    const { amount } = req.body; // can be positive (restock) or negative (manual correction)
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    product.stock = Math.max(0, product.stock + Number(amount));
    await product.save();

    res.status(200).json({ success: true, data: product });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to adjust stock', error: err.message });
  }
};