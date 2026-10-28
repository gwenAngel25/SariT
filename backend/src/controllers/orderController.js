// ============================================================
// Order Controller
// Handles: order creation, listing, single lookup, and the
// Haversine Geofencing verification (with real-time WebSocket broadcast).
// ============================================================
const Order = require('../models/Order');
const Product = require('../models/Product');
const Queue = require('../models/Queue');
const { haversineDistance } = require('../utils/haversine');
const store = require('../config/store');
const { getIO } = require('../socket'); // WebSocket emitter access

// ------------------------------------------------------------
// [C3] POST /api/orders — Customer submits Digital Order Slip
// ------------------------------------------------------------
exports.createOrder = async (req, res) => {
  try {
    const { customerName, contactNumber, items } = req.body;

    // --- STEP 1: Basic validation ---
    if (!customerName || !contactNumber) {
      return res.status(400).json({ success: false, message: 'Customer name and contact number are required' });
    }
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Order must contain at least one item' });
    }

    // --- STEP 2: Verify stock availability, snapshot price/name ---
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

    // --- STEP 3: Generate human-readable order code (e.g. SRT-00482) ---
    const orderCount = await Order.countDocuments();
    const orderCode = `SRT-${String(orderCount + 1).padStart(5, '0')}`;

    // --- STEP 4: Save order in staged_pending state (waiting for geofence entry — C4) ---
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

// ------------------------------------------------------------
// [Cashier Dashboard] PATCH /api/orders/:id/status
// Gi-drive sa Cashier Dashboard — pag-usab sa status sa order:
//   staging → ready_for_pickup  (gihuman na ang pag-stack sa items)
//   ready_for_pickup → paid     (bayad na, human na ang transaction)
// ------------------------------------------------------------
// NOTE: Ang full payment + QR verification (M6/B4) usa ka LATER step.
//       Karon kay "mark paid" lang sa cashier — manual nga pag-flag.
// ------------------------------------------------------------
exports.updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    // --- Validate allowed transitions (guard sa status lifecycle) ---
    const allowedTransitions = {
      staging: 'ready_for_pickup',
      ready_for_pickup: 'paid',
    };
    const expectedNext = allowedTransitions[order.status];

    if (!expectedNext || expectedNext !== status) {
      return res.status(400).json({
        success: false,
        message: `Cannot move order from ${order.status} to ${status}. Allowed next: ${expectedNext || 'none'}`,
      });
    }

    order.status = status;

    // --- Kung "paid" na, i-remove sa queue ug i-deduct ang stock (M7) ---
    if (status === 'paid') {
      const queue = await Queue.findOne({ storeId: 'main' });
      if (queue) {
        await queue.removeOrder(order._id); // mag-reorder ug mag-save na kini mismo
      }

      for (const item of order.items) {
        const product = await Product.findById(item.product);
        if (product) {
          await product.deductStock(item.quantity);
        }
      }
      order.queue.position = null;
    }

    await order.save();

    // --- REAL-TIME BROADCAST ---
    // I-update ang customer's Order Status page (nag-live ang stepper).
    const io = getIO();
    io.to(`order:${order._id}`).emit('order:updated', {
      _id: order._id,
      orderCode: order.orderCode,
      status: order.status,
      queue: order.queue,
    });

    // Kung na-remove sa queue, i-refresh pud ang Cashier Dashboard.
    if (status === 'paid') {
      const updatedQueue = await Queue.findOne({ storeId: 'main' });
      io.to('queue:main').emit('queue:updated', updatedQueue);
    }

    res.status(200).json({ success: true, data: order });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update order status', error: err.message });
  }
};

// ------------------------------------------------------------
// [Admin/Cashier] GET /api/orders — list all orders
// Supports ?status=queued (or any status) as a filter
// ------------------------------------------------------------
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

// ------------------------------------------------------------
// [C8] GET /api/orders/:id — single order detail
// Used by the customer's Order Status page
// ------------------------------------------------------------
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

// ------------------------------------------------------------
// [C4, B2] PATCH /api/orders/:id/verify-location
// Haversine Geofencing Controller — the core of Proximity Geofencing
// ------------------------------------------------------------
exports.verifyLocation = async (req, res) => {
  try {
    const { latitude, longitude } = req.body;

    // --- STEP 1: Validate input coordinates ---
    if (latitude === undefined || longitude === undefined) {
      return res.status(400).json({ success: false, message: 'Latitude and longitude are required' });
    }

    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    // --- STEP 2: Only staged_pending orders can be geofence-checked ---
    if (order.status !== 'staged_pending') {
      return res.status(400).json({
        success: false,
        message: `Order is already ${order.status}; geofence check not applicable`
      });
    }

    // --- STEP 3: Core Haversine calculation ---
    const distance = haversineDistance(
      store.latitude, store.longitude,
      latitude, longitude
    );
    const withinRange = distance <= store.geofenceRadiusMeters;

    order.geofence = {
      verified: withinRange,
      distanceMeters: Math.round(distance),
      verifiedAt: withinRange ? new Date() : null,
    };

    // --- STEP 4: Entry Transition — promote into active FIFO queue (M1) ---
    if (withinRange) {
      order.status = 'queued';

      let queue = await Queue.findOne({ storeId: 'main' });
      if (!queue) {
        queue = await Queue.create({ storeId: 'main', entries: [] });
      }

      queue.entries.push({
        order: order._id,
        orderCode: order.orderCode,
        customerName: order.customer.name,
        position: queue.entries.length + 1,
        priority: false,
      });
      await queue.reorder(); // re-sorts by priority+FIFO and saves the queue

      // Sync the computed position back onto this order
      const myEntry = queue.entries.find(e => e.order.toString() === order._id.toString());
      order.queue.position = myEntry ? myEntry.position : null;
    }

    await order.save();

    // --- STEP 5: REAL-TIME BROADCAST #1 ---
    // Tell this specific customer's Order Status page their order changed,
    // so the stepper updates live without a page refresh.
    getIO().to(`order:${order._id}`).emit('order:updated', {
      _id: order._id,
      orderCode: order.orderCode,
      status: order.status,
      geofence: order.geofence,
      queue: order.queue,
    });

    // --- STEP 6: REAL-TIME BROADCAST #2 ---
    // Tell the Cashier Dashboard the shared queue changed
    // (only fires when the order actually entered the queue).
    if (withinRange) {
      const updatedQueue = await Queue.findOne({ storeId: 'main' });
      getIO().to('queue:main').emit('queue:updated', updatedQueue);
    }

    res.status(200).json({
      success: true,
      data: { order, distanceMeters: Math.round(distance), withinRange },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to verify location', error: err.message });
  }
};

// ------------------------------------------------------------
// [Step 6] POST /api/orders/:id/release
// Cashier releases items to customer after payment is verified.
// Only paid orders can be released.
// ------------------------------------------------------------
exports.releaseOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    // Must be paid but not yet released
    if (order.status !== 'paid') {
      return res.status(400).json({
        success: false,
        message: `Cannot release order with status: ${order.status}. Only paid orders can be released.`
      });
    }

    if (order.releasedAt) {
      return res.status(400).json({
        success: false,
        message: 'Order has already been released'
      });
    }

    // Mark as released
    order.releasedAt = new Date();
    order.releasedBy = req.user.id;
    order.status = 'completed';
    await order.save();

    // Real-time broadcast
    const io = getIO();
    io.to(`order:${order._id}`).emit('order:updated', {
      _id: order._id,
      orderCode: order.orderCode,
      status: order.status,
      releasedAt: order.releasedAt,
    });

    res.status(200).json({
      success: true,
      data: {
        order: {
          _id: order._id,
          orderCode: order.orderCode,
          customerName: order.customer.name,
          totalAmount: order.totalAmount,
          status: order.status,
          releasedAt: order.releasedAt,
        },
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to release order', error: err.message });
  }
};

// ------------------------------------------------------------
// PATCH /api/orders/:id/choose-payment
// Customer chooses payment method: 'cash' or 'gcash'
// ------------------------------------------------------------
exports.choosePayment = async (req, res) => {
  try {
    const { method } = req.body;

    if (!['cash', 'gcash'].includes(method)) {
      return res.status(400).json({ success: false, message: 'Method must be cash or gcash' });
    }

    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    if (order.status !== 'ready_for_pickup') {
      return res.status(400).json({
        success: false,
        message: `Can only choose payment when order is ready. Current status: ${order.status}`
      });
    }

    order.paymentMethod = method;
    await order.save();

    res.status(200).json({
      success: true,
      data: {
        _id: order._id,
        orderCode: order.orderCode,
        paymentMethod: order.paymentMethod,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to set payment method', error: err.message });
  }
};