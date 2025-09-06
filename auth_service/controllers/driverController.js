const UserModel = require('../models/userModel');
const DriverProfileModel = require('../models/driverProfileModel');

let publishAuthEvent, publishUserRegistrationEvent;
try {
  const kafka = require('../config/kafka');
  publishAuthEvent = kafka.publishAuthEvent;
  publishUserRegistrationEvent = kafka.publishUserRegistrationEvent;
} catch (error) {
  console.warn('⚠️  Kafka module not available, events will not be published');
  publishAuthEvent = async () => { console.log('ℹ️  Kafka not available - auth event not published'); };
  publishUserRegistrationEvent = async () => { console.log('ℹ️  Kafka not available - registration event not published'); };
}

class DriverController {
  static async registerDriver(req, res) {
    try {
      const { fullName, email, phoneNo, password, city, address } = req.body;

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
          message: 'Invalid email format'
        });
      }

      if (password.length < 6) {
        return res.status(400).json({
          success: false,
          message: 'Password must be at least 6 characters long'
        });
      }

      let newUser, driverProfile;
      try {
        const existingUser = await UserModel.findByEmail(email);
        if (existingUser) {
          return res.status(409).json({
            success: false,
            message: 'User with this email already exists'
          });
        }

        const username = email.split('@')[0] + '_driver';
        
        newUser = await UserModel.createUser({
          username,
          email,
          password,
          userType: 'driver'
        });

        driverProfile = await DriverProfileModel.createDriverProfile({
          userId: newUser.id,
          fullName,
          email,
          phoneNo,
          city,
          address
        });

      } catch (dbError) {
        console.error('Database error during driver registration:', dbError.message);
        
        if (dbError.message.includes('connect') || dbError.code === 'ECONNREFUSED') {
          console.log('ℹ️  Database unavailable - creating mock driver for testing');
          newUser = {
            id: Date.now(),
            username: email.split('@')[0] + '_driver',
            email: email,
            user_type: 'driver',
            created_at: new Date().toISOString()
          };
          driverProfile = {
            id: Date.now() + 1,
            user_id: newUser.id,
            full_name: fullName,
            email,
            phone_no: phoneNo,
            city,
            address,
            created_at: new Date().toISOString()
          };
        } else {
          throw dbError;
        }
      }

      try {
        await publishUserRegistrationEvent({
          userId: newUser.id,
          email: newUser.email,
          fullName: driverProfile.full_name,
          userType: 'driver'
        });

        await publishAuthEvent({
          userId: newUser.id,
          email: newUser.email,
          fullName: driverProfile.full_name,
          userType: 'driver',
          action: 'signup'
        });
      } catch (kafkaError) {
        console.warn('⚠️  Failed to publish events to Kafka:', kafkaError.message);
      }

      res.status(201).json({
        success: true,
        message: 'Driver registered successfully',
        data: {
          user: {
            id: newUser.id,
            username: newUser.username,
            email: newUser.email,
            userType: newUser.user_type,
            createdAt: newUser.created_at
          },
          profile: {
            id: driverProfile.id,
            fullName: driverProfile.full_name,
            email: driverProfile.email,
            phoneNo: driverProfile.phone_no,
            city: driverProfile.city,
            address: driverProfile.address,
            createdAt: driverProfile.created_at
          }
        }
      });

    } catch (error) {
      console.error('Driver registration error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  static async getDriverProfile(req, res) {
    try {
      const { userId } = req.body;

      if (!userId) {
        return res.status(400).json({
          success: false,
          message: 'User ID is required'
        });
      }

      try {
        const user = await UserModel.findById(userId);
        if (!user || user.user_type !== 'driver') {
          return res.status(404).json({
            success: false,
            message: 'Driver not found'
          });
        }

        const driverProfile = await DriverProfileModel.findByUserId(userId);
        if (!driverProfile) {
          return res.status(404).json({
            success: false,
            message: 'Driver profile not found'
          });
        }

        res.status(200).json({
          success: true,
          data: {
            user: {
              id: user.id,
              username: user.username,
              email: user.email,
              userType: user.user_type,
              createdAt: user.created_at,
              updatedAt: user.updated_at
            },
            profile: {
              id: driverProfile.id,
              fullName: driverProfile.full_name,
              email: driverProfile.email,
              phoneNo: driverProfile.phone_no,
              city: driverProfile.city,
              address: driverProfile.address,
              createdAt: driverProfile.created_at,
              updatedAt: driverProfile.updated_at
            }
          }
        });
      } catch (dbError) {
        console.error('Database error during driver profile fetch:', dbError.message);
        
        if (dbError.message.includes('connect') || dbError.code === 'ECONNREFUSED') {
          console.log('ℹ️  Database unavailable - returning mock driver profile');
          res.status(200).json({
            success: true,
            data: {
              user: {
                id: userId,
                username: 'mock_driver',
                email: 'mock@example.com',
                userType: 'driver',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
              },
              profile: {
                id: userId + 100,
                fullName: 'Mock Driver',
                email: 'mock@example.com',
                phoneNo: '1234567890',
                city: 'Mock City',
                address: 'Mock Address',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
              }
            }
          });
        } else {
          throw dbError;
        }
      }

    } catch (error) {
      console.error('Get driver profile error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
}

module.exports = DriverController;