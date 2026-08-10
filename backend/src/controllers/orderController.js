const Order = require('../models/Order');
const Product = require('../models/Product');

// POST /api/orders — Customer submits Digital Order Slip (C3)
exports.createOrder = async (req, res) => {
  try {
    const { customerName, contactNumber, items } = req.body;

    // --- Basic validation ---
    if (!customerName || !contactNumber) {
      return res.status(400).json({ success: false, message: 'Customer name and contact number are required' });
    }
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Order must contain at least one item' });
    }

    // --- Verify stock availability and build order items with price snapshot ---
    const orderItems = [];
    let totalAmount = 0;

    for (const item of items) {
      const product = await Product.findById(item.productId);

      if (!product) {
        return res.status(404).json({ success: false, message: `Product not found: ${item.productId}` });
      }
      if (!product.isActive) {
        return res.status(400).json({ success: false, message: `${product.name} is currently unavailable` });
      }
      if (product.stock < item.quantity) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for ${product.name}. Available: ${product.stock}, Requested: ${item.quantity}`
        });
      }

      orderItems.push({
        product: product._id,
        name: product.name,     // snapshot — dili apektado kung mausab unya ang product
        price: product.price,   // snapshot
        quantity: item.quantity
      });

      totalAmount += product.price * item.quantity;
    }

    // --- Generate human-readable order code (e.g. SRT-00482) ---
    const orderCount = await Order.countDocuments();
    const orderCode = `SRT-${String(orderCount + 1).padStart(5, '0')}`;

    // --- Save order in staged_pending state (waiting for geofence entry — C4) ---
    const order = await Order.create({
      orderCode,
      customer: { name: customerName, contactNumber },
      items: orderItems,
      totalAmount,
      status: 'staged_pending'
      // Note: stock is NOT deducted yet — only deducted when order is marked "paid" (M7)
    });

    res.status(201).json({ success: true, data: order });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to create order', error: err.message });
  }
};

// GET /api/orders — list all orders (Admin/Cashier view)
exports.getAllOrders = async (req, res) => {
  try {
    const { status } = req.query;
    const filter = status ? { status } : {};

    const orders = await Order.find(filter).sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: orders.length, data: orders });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch orders', error: err.message });
  }
};

// GET /api/orders/:id — single order detail
exports.getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }
    res.status(200).json({ success: true, data: order });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch order', error: err.message });
  }
};