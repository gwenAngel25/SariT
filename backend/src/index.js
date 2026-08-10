require('dotenv').config();

const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// --- Routes ---
const productRoutes = require('./routes/productRoutes');
app.use('/api/products', productRoutes);

const orderRoutes = require('./routes/orderRoutes');
app.use('/api/orders', orderRoutes);

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const mongoURI = process.env.MONGO_URI || "mongodb://database:27017/saritrack";
mongoose.connect(mongoURI)
  .then(() => console.log("Connected to MongoDB successfully!"))
  .catch(err => console.error("MongoDB connection error:", err));

app.get('/api/health', (req, res) => {
  res.json({ status: "UP", message: "SariTrack backend is fully operational!" });
});

io.on('connection', (socket) => {
  console.log(`Client connected to WebSockets: ${socket.id}`);
  socket.on('disconnect', () => {
    console.log('Client disconnected from WebSockets');
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`SariTrack Backend running on port ${PORT}`);
});