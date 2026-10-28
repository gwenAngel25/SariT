const Queue = require('../models/Queue');
const Order = require('../models/Order');
const { getIO } = require('../socket'); // WebSocket emitter access — para ma-live ang dashboard

// GET /api/queue — Live FIFO queue view (M1)
exports.getQueue = async (req, res) => {
  try {
    let queue = await Queue.findOne({ storeId: 'main' });
    if (!queue) {
      queue = await Queue.create({ storeId: 'main', entries: [] });
    }
    res.status(200).json({ success: true, count: queue.entries.length, data: queue.entries });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch queue', error: err.message });
  }
};

// PATCH /api/queue/:orderId/call — Call-Next-Customer control (M3)
exports.callCustomer = async (req, res) => {
  try {
    const queue = await Queue.findOne({ storeId: 'main' });
    if (!queue) {
      return res.status(404).json({ success: false, message: 'Queue not found' });
    }

    const entry = queue.entries.find(e => e.order.toString() === req.params.orderId);
    if (!entry) {
      return res.status(404).json({ success: false, message: 'Order not found in queue' });
    }

    const order = await Order.findById(req.params.orderId);
    order.status = 'staging';
    order.queue.calledAt = new Date();
    await order.save();

    // --- REAL-TIME BROADCAST ---
    // I-update ang customer's Order Status page (moving to "Staging")
    // ug i-refresh ang Cashier Dashboard nga naa sa room nga queue:main.
    const io = getIO();
    io.to(`order:${order._id}`).emit('order:updated', {
      _id: order._id,
      orderCode: order.orderCode,
      status: order.status,
      queue: order.queue,
    });
    io.to('queue:main').emit('queue:updated', queue);

    res.status(200).json({ success: true, data: order });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to call customer', error: err.message });
  }
};

// DELETE /api/queue/:orderId — remove from queue once served (used internally after payment)
exports.removeFromQueue = async (req, res) => {
  try {
    const queue = await Queue.findOne({ storeId: 'main' });
    if (!queue) {
      return res.status(404).json({ success: false, message: 'Queue not found' });
    }

    await queue.removeOrder(req.params.orderId);

    // sync updated positions back onto each Order document
    for (const entry of queue.entries) {
      await Order.findByIdAndUpdate(entry.order, { 'queue.position': entry.position });
    }

    // --- REAL-TIME BROADCAST ---
    // Kung na-remove na ang customer sa queue, i-refresh ang Cashier Dashboard.
    getIO().to('queue:main').emit('queue:updated', queue);

    res.status(200).json({ success: true, data: queue.entries });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to remove from queue', error: err.message });
  }
};