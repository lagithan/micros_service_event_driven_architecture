const express = require('express');
const ClientController = require('../controllers/clientController');

const router = express.Router();

const validateClientRegistration = (req, res, next) => {
  const { name, email, password, phoneNo, businessType, city, address } = req.body;
  
  if (!name || !email || !password) {
    return res.status(400).json({
      success: false,
      message: 'Name, email, and password are required'
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
  
  if (name.trim().length < 1) {
    return res.status(400).json({
      success: false,
      message: 'Name cannot be empty'
    });
  }
  
  next();
};

router.post('/register', validateClientRegistration, ClientController.registerClient);
router.post('/profile', ClientController.getClientProfile);

router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Client routes are healthy',
    service: 'auth-service',
    routes: {
      available: [
        'POST /api/client/register',
        'POST /api/client/profile'
      ]
    },
    timestamp: new Date().toISOString()
  });
});

router.use((error, req, res, next) => {
  console.error('Client route error:', error);
  
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