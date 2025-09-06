const express = require('express');
const AuthController = require('../controllers/authController');

const router = express.Router();



// Input validation middleware
const validateRegistration = (req, res, next) => {
  const { email, password, firstName, lastName } = req.body;
  
  if (!email || !password || !firstName || !lastName) {
    return res.status(400).json({
      success: false,
      message: 'All fields (email, password, firstName, lastName) are required'
    });
  }
  
  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({
      success: false,
      message: 'Please provide a valid email address'
    });
  }
  
  // Password validation
  if (password.length < 6) {
    return res.status(400).json({
      success: false,
      message: 'Password must be at least 6 characters long'
    });
  }
  
  // Name validation
  if (firstName.trim().length < 1 || lastName.trim().length < 1) {
    return res.status(400).json({
      success: false,
      message: 'First name and last name cannot be empty'
    });
  }
  
  next();
};

const validateLogin = (req, res, next) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: 'Email and password are required'
    });
  }
  
  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({
      success: false,
      message: 'Please provide a valid email address'
    });
  }
  
  next();
};

// Public routes
router.post('/register', validateRegistration, AuthController.register);
router.post('/login', validateLogin, AuthController.login);

// Routes (no authentication required - stateless)
router.post('/logout', AuthController.logout);
router.post('/profile', AuthController.getProfile);
router.put('/profile', AuthController.updateProfile);

// Check authentication status
router.post('/check', AuthController.checkAuth);

// Health check for this specific route group
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Auth routes are healthy',
    service: 'auth-service',
    routes: {
      available: [
        'POST /api/auth/register',
        'POST /api/auth/login',
        'POST /api/auth/logout',
        'POST /api/auth/profile',
        'PUT /api/auth/profile',
        'POST /api/auth/check'
      ]
    },
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware for auth routes
router.use((error, req, res, next) => {
  console.error('Auth route error:', error);
  
  // Handle specific error types
  if (error.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: error.details
    });
  }
  
  if (error.code === '23505') {
    return res.status(409).json({
      success: false,
      message: 'Email already exists'
    });
  }
  
  // Generic error response
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? error.message : undefined
  });
});

module.exports = router;