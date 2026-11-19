const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');

// Module Routes
const authRoutes = require('./modules/auth/authRoutes');
const userRoutes = require('./modules/users/userRoutes');
const productRoutes = require('./modules/products/productRoutes');
const categoryRoutes = require('./modules/categories/categoryRoutes');
const cartRoutes = require('./modules/cart/cartRoutes');
const wishlistRoutes = require('./modules/wishlist/wishlistRoutes');
const orderRoutes = require('./modules/orders/orderRoutes');
const couponRoutes = require('./modules/coupons/couponRoutes');
const reviewRoutes = require('./modules/reviews/reviewRoutes');
const addressRoutes = require('./modules/addresses/addressRoutes');
const newsletterRoutes = require('./modules/newsletter/newsletterRoutes');
const adminRoutes = require('./modules/admin/adminRoutes');

const { notFoundHandler, errorHandler } = require('./middleware/errorMiddleware');

const app = express();

// Security & Parsing Middlewares
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Paths
const frontendDir = path.resolve(__dirname, '../../frontend');
const pagesDir = path.join(frontendDir, 'pages');
const adminDir = path.join(frontendDir, 'admin');
const adminPagesDir = path.join(adminDir, 'pages');
const uploadsDir = path.resolve(__dirname, '../../uploads');

// Clean Frontend Multi-Page Routes
app.get('/', (req, res) => res.sendFile(path.join(pagesDir, 'index.html')));
app.get('/index.html', (req, res) => res.sendFile(path.join(pagesDir, 'index.html')));
app.get('/shop', (req, res) => res.sendFile(path.join(pagesDir, 'shop.html')));
app.get('/product', (req, res) => res.sendFile(path.join(pagesDir, 'product.html')));
app.get('/product/:slug', (req, res) => res.sendFile(path.join(pagesDir, 'product.html')));
app.get('/categories', (req, res) => res.sendFile(path.join(pagesDir, 'categories.html')));
app.get('/cart', (req, res) => res.sendFile(path.join(pagesDir, 'cart.html')));
app.get('/checkout', (req, res) => res.sendFile(path.join(pagesDir, 'checkout.html')));
app.get('/order-success', (req, res) => res.sendFile(path.join(pagesDir, 'order-success.html')));
app.get('/login', (req, res) => res.sendFile(path.join(pagesDir, 'login.html')));
app.get('/register', (req, res) => res.sendFile(path.join(pagesDir, 'register.html')));
app.get('/forgot-password', (req, res) => res.sendFile(path.join(pagesDir, 'forgot-password.html')));
app.get('/wishlist', (req, res) => res.sendFile(path.join(pagesDir, 'wishlist.html')));
app.get('/about', (req, res) => res.sendFile(path.join(pagesDir, 'about.html')));
app.get('/contact', (req, res) => res.sendFile(path.join(pagesDir, 'contact.html')));
app.get('/privacy-policy', (req, res) => res.sendFile(path.join(pagesDir, 'privacy-policy.html')));
app.get('/terms-and-conditions', (req, res) => res.sendFile(path.join(pagesDir, 'terms-and-conditions.html')));
app.get('/404', (req, res) => res.sendFile(path.join(pagesDir, '404.html')));

// Customer Account Routes
app.get('/account', (req, res) => res.sendFile(path.join(pagesDir, 'account/index.html')));
app.get('/account/orders', (req, res) => res.sendFile(path.join(pagesDir, 'account/orders.html')));
app.get('/account/orders/:id', (req, res) => res.sendFile(path.join(pagesDir, 'account/order-details.html')));
app.get('/account/addresses', (req, res) => res.sendFile(path.join(pagesDir, 'account/addresses.html')));
app.get('/account/profile', (req, res) => res.sendFile(path.join(pagesDir, 'account/profile.html')));

// Clean Admin Multi-Page Routes
app.get('/admin', (req, res) => res.sendFile(path.join(adminDir, 'index.html')));
app.get('/admin/login', (req, res) => res.sendFile(path.join(adminPagesDir, 'login.html')));
app.get('/admin/dashboard', (req, res) => res.sendFile(path.join(adminPagesDir, 'dashboard.html')));
app.get('/admin/products', (req, res) => res.sendFile(path.join(adminPagesDir, 'products.html')));
app.get('/admin/products/add', (req, res) => res.sendFile(path.join(adminPagesDir, 'add-product.html')));
app.get('/admin/products/edit', (req, res) => res.sendFile(path.join(adminPagesDir, 'edit-product.html')));
app.get('/admin/products/edit/:id', (req, res) => res.sendFile(path.join(adminPagesDir, 'edit-product.html')));
app.get('/admin/categories', (req, res) => res.sendFile(path.join(adminPagesDir, 'categories.html')));
app.get('/admin/orders', (req, res) => res.sendFile(path.join(adminPagesDir, 'orders.html')));
app.get('/admin/orders/:id', (req, res) => res.sendFile(path.join(adminPagesDir, 'order-details.html')));
app.get('/admin/customers', (req, res) => res.sendFile(path.join(adminPagesDir, 'customers.html')));
app.get('/admin/customers/:id', (req, res) => res.sendFile(path.join(adminPagesDir, 'customer-details.html')));
app.get('/admin/inventory', (req, res) => res.sendFile(path.join(adminPagesDir, 'inventory.html')));
app.get('/admin/coupons', (req, res) => res.sendFile(path.join(adminPagesDir, 'coupons.html')));
app.get('/admin/reviews', (req, res) => res.sendFile(path.join(adminPagesDir, 'reviews.html')));
app.get('/admin/newsletter', (req, res) => res.sendFile(path.join(adminPagesDir, 'newsletter.html')));
app.get('/admin/reports', (req, res) => res.sendFile(path.join(adminPagesDir, 'reports.html')));
app.get('/admin/settings', (req, res) => res.sendFile(path.join(adminPagesDir, 'settings.html')));

// Static Assets
app.use('/admin/assets', express.static(path.join(adminDir, 'assets')));
app.use('/assets', express.static(path.join(frontendDir, 'assets')));
app.use('/uploads', express.static(uploadsDir));
app.use(express.static(frontendDir, { index: false }));

// API Health Check
app.get('/api/health', async (req, res) => {
  const db = require('./config/database');
  try {
    const dbStatus = await db.testConnection();
    res.status(200).json({
      status: 'UP',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      database: dbStatus
    });
  } catch (err) {
    res.status(503).json({
      status: 'DOWN',
      error: 'Database connection failed'
    });
  }
});

// REST API Routers
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/wishlist', wishlistRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/coupons', couponRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/addresses', addressRoutes);
app.use('/api/newsletter', newsletterRoutes);
app.use('/api/admin', adminRoutes);

// Error Middlewares
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
