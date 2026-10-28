require('dotenv').config();

const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const { Server } = require('socket.io');
const cors = require('cors');
const { initSocket } = require('./socket');

const app = express();

// CORS — allow any origin in development, whitelist in production
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    // In development, allow anything (LAN testing from phone)
    if (process.env.NODE_ENV === 'development') return callback(null, true);
    // Production whitelist
    const whitelist = ['http://localhost:3000', 'http://localhost'];
    if (whitelist.includes(origin)) return callback(null, true);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));

app.use(express.json());

// --- Routes ---
const authRoutes = require('./routes/authRoutes');
app.use('/api/auth', authRoutes);

const storeRoutes = require('./routes/storeRoutes');
app.use('/api/store', storeRoutes);

const productRoutes = require('./routes/productRoutes');
app.use('/api/products', productRoutes);

const orderRoutes = require('./routes/orderRoutes');
app.use('/api/orders', orderRoutes);

const queueRoutes = require('./routes/queueRoutes');
app.use('/api/queue', queueRoutes);

const paymentRoutes = require('./routes/paymentRoutes');
app.use('/api/payments', paymentRoutes);

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (process.env.NODE_ENV === 'development') return callback(null, true);
      const whitelist = ['http://localhost:3000', 'http://localhost'];
      if (whitelist.includes(origin)) return callback(null, true);
      callback(new Error('Not allowed by CORS'));
    },
    methods: ["GET", "POST"],
    credentials: true,
  }
});

initSocket(io);

const mongoURI = process.env.MONGO_URI || "mongodb://database:27017/saritrack";
mongoose.connect(mongoURI)
  .then(() => console.log("Connected to MongoDB successfully!"))
  .catch(err => console.error("MongoDB connection error:", err));

app.get('/api/health', (req, res) => {
  res.json({ status: "UP", message: "SariTrack backend is fully operational!" });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`SariTrack Backend running on port ${PORT}`);
});