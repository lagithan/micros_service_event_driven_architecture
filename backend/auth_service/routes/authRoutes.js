const express = require('express');
const AuthController = require('../controllers/authController');

const router = express.Router();



// Input validation middleware

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

// Public routes (registration is now handled by separate client/driver endpoints)
router.post('/login', validateLogin, AuthController.login);

// Routes (no authentication required - stateless)
router.post('/logout', AuthController.logout);
router.post('/profile', AuthController.getProfile);

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
        'POST /api/auth/login',
        'POST /api/auth/logout',
        'POST /api/auth/profile',
        'POST /api/auth/check'
      ],
      note: 'Registration is now handled by separate /api/client/register and /api/driver/register endpoints'
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