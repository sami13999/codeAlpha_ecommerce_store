const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');

const authRoutes = require('./routes/authRoutes');
const productRoutes = require('./routes/productRoutes');
const cartRoutes = require('./routes/cartRoutes');
const orderRoutes = require('./routes/orderRoutes');
const newsletterRoutes = require('./routes/newsletterRoutes');
const { notFoundHandler, errorHandler } = require('./middleware/errorMiddleware');

const app = express();

// Security Middlewares
app.use(helmet({
  contentSecurityPolicy: false // Allows inline scripts/styles for clean vanilla JS integration
}));
app.use(cors());

// Request Body Parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static frontend assets and pages
const clientDir = path.resolve(__dirname, '../client');
const uploadsDir = path.resolve(__dirname, '../uploads');

app.use('/uploads', express.static(uploadsDir));
app.use(express.static(clientDir));

// Friendly Clean Frontend Page Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(clientDir, 'index.html'));
});

app.get('/product', (req, res) => {
  res.sendFile(path.join(clientDir, 'pages/product.html'));
});

app.get('/cart', (req, res) => {
  res.sendFile(path.join(clientDir, 'pages/cart.html'));
});

app.get('/checkout', (req, res) => {
  res.sendFile(path.join(clientDir, 'pages/checkout.html'));
});

app.get('/auth', (req, res) => {
  res.sendFile(path.join(clientDir, 'pages/auth.html'));
});

app.get('/orders', (req, res) => {
  res.sendFile(path.join(clientDir, 'pages/orders.html'));
});

// API Routes
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'UP',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/newsletter', newsletterRoutes);

// Error Handling Middlewares
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;

