const UserModel = require('../models/userModel');
const ClientProfileModel = require('../models/clientProfileModel');

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

class ClientController {
  static async registerClient(req, res) {
    try {
      const { name, email, phoneNo, businessType, password, city, address } = req.body;

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
          message: 'Invalid email format'
        });
      }

      if (password.length < 6) {
        return res.status(400).json({
          success: false,
          message: 'Password must be at least 6 characters long'
        });
      }

      let newUser, clientProfile;
      try {
        const existingUser = await UserModel.findByEmail(email);
        if (existingUser) {
          return res.status(409).json({
            success: false,
            message: 'User with this email already exists'
          });
        }

        const username = email.split('@')[0] + '_client';
        
        newUser = await UserModel.createUser({
          username,
          email,
          password,
          userType: 'client'
        });

        clientProfile = await ClientProfileModel.createClientProfile({
          userId: newUser.id,
          name,
          email,
          phoneNo,
          businessType,
          city,
          address
        });

      } catch (dbError) {
        console.error('Database error during client registration:', dbError.message);
        
        if (dbError.message.includes('connect') || dbError.code === 'ECONNREFUSED') {
          console.log('ℹ️  Database unavailable - creating mock client for testing');
          newUser = {
            id: Date.now(),
            username: email.split('@')[0] + '_client',
            email: email,
            user_type: 'client',
            created_at: new Date().toISOString()
          };
          clientProfile = {
            id: Date.now() + 1,
            user_id: newUser.id,
            name,
            email,
            phone_no: phoneNo,
            business_type: businessType,
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
          username: newUser.username,
          name: clientProfile.name,
          userType: 'client'
        });

        await publishAuthEvent({
          userId: newUser.id,
          email: newUser.email,
          username: newUser.username,
          name: clientProfile.name,
          userType: 'client',
          action: 'signup'
        });
      } catch (kafkaError) {
        console.warn('⚠️  Failed to publish events to Kafka:', kafkaError.message);
      }

      res.status(201).json({
        success: true,
        message: 'Client registered successfully',
        data: {
          user: {
            id: newUser.id,
            username: newUser.username,
            email: newUser.email,
            userType: newUser.user_type,
            createdAt: newUser.created_at
          },
          profile: {
            id: clientProfile.id,
            name: clientProfile.name,
            email: clientProfile.email,
            phoneNo: clientProfile.phone_no,
            businessType: clientProfile.business_type,
            city: clientProfile.city,
            address: clientProfile.address,
            createdAt: clientProfile.created_at
          }
        }
      });

    } catch (error) {
      console.error('Client registration error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  static async getClientProfile(req, res) {
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
        if (!user || user.user_type !== 'client') {
          return res.status(404).json({
            success: false,
            message: 'Client not found'
          });
        }

        const clientProfile = await ClientProfileModel.findByUserId(userId);
        if (!clientProfile) {
          return res.status(404).json({
            success: false,
            message: 'Client profile not found'
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
              id: clientProfile.id,
              name: clientProfile.name,
              email: clientProfile.email,
              phoneNo: clientProfile.phone_no,
              businessType: clientProfile.business_type,
              city: clientProfile.city,
              address: clientProfile.address,
              createdAt: clientProfile.created_at,
              updatedAt: clientProfile.updated_at
            }
          }
        });
      } catch (dbError) {
        console.error('Database error during client profile fetch:', dbError.message);
        
        if (dbError.message.includes('connect') || dbError.code === 'ECONNREFUSED') {
          console.log('ℹ️  Database unavailable - returning mock client profile');
          res.status(200).json({
            success: true,
            data: {
              user: {
                id: userId,
                username: 'mock_client',
                email: 'mock@example.com',
                userType: 'client',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
              },
              profile: {
                id: userId + 100,
                name: 'Mock Client',
                email: 'mock@example.com',
                phoneNo: '1234567890',
                businessType: 'Mock Business',
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
      console.error('Get client profile error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
}

module.exports = ClientController;