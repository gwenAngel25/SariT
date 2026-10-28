// ============================================================
// Centralized Socket.io instance manager
// Ngano naay separate file: ang `io` instance gihimo sulod sa
// index.js, apan kinahanglan nato kini i-access gikan sa mga
// controllers (e.g. orderController.js) para mag-emit og
// real-time events. Ang direct import sa index.js gikan sa
// controller mahimo'g circular dependency — mao nga ang small
// "registry" module sama ani mao ang standard pattern.
// ============================================================
let ioInstance = null;

// Tawagon ni sa index.js human ma-create ang `io` (new Server(server, ...))
function initSocket(io) {
  ioInstance = io;

  io.on('connection', (socket) => {
    console.log(`Client connected to WebSockets: ${socket.id}`);

    // Customer's Order Status page: "only send me updates for MY order"
    socket.on('joinOrderRoom', (orderId) => {
      socket.join(`order:${orderId}`);
    });

    // Cashier Dashboard: "send me updates for the whole shared queue"
    socket.on('joinQueueRoom', () => {
      socket.join('queue:main');
    });

    socket.on('disconnect', () => {
      console.log(`Client disconnected from WebSockets: ${socket.id}`);
    });
  });
}

// Gamiton sa mga controllers: const { getIO } = require('../socket');
function getIO() {
  if (!ioInstance) {
    throw new Error('Socket.io has not been initialized yet');
  }
  return ioInstance;
}

module.exports = { initSocket, getIO };