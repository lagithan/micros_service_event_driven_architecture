const express = require('express');
const DriverController = require('../controllers/driverController');

const router = express.Router();

const validateDriverRegistration = (req, res, next) => {
  const { fullName, email, password, phoneNo, city, address } = req.body;
  
  if (!fullName || !email || !password) {
    return res.status(400).json({
      success: false,
      message: 'Full name, email, and password are required'
    });
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({
      success: false,
      message: 'Please provide a valid email address'
    });
  }
  
  if (password.length < 6) {
    return res.status(400).json({
      success: false,
      message: 'Password must be at least 6 characters long'
    });
  }
  
  if (fullName.trim().length < 1) {
    return res.status(400).json({
      success: false,
      message: 'Full name cannot be empty'
    });
  }
  
  next();
};

router.post('/register', validateDriverRegistration, DriverController.registerDriver);
router.post('/profile', DriverController.getDriverProfile);

router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Driver routes are healthy',
    service: 'auth-service',
    routes: {
      available: [
        'POST /api/driver/register',
        'POST /api/driver/profile'
      ]
    },
    timestamp: new Date().toISOString()
  });
});

router.use((error, req, res, next) => {
  console.error('Driver route error:', error);
  
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
  
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? error.message : undefined
  });
});

module.exports = router;