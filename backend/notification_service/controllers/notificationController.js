const { sendEmail, sendWelcomeEmail, sendLoginNotificationEmail, testEmailConnection } = require('../config/email');
const { publishNotificationStatus } = require('../config/kafka');

class NotificationController {
  // Send manual notification (for testing purposes)
  static async sendManualNotification(req, res) {
    try {
    const { to, subject, message, type = 'manual', username = '' } = req.body;

      // Validation
      if (!to || !subject || !message) {
        return res.status(400).json({
          success: false,
          message: 'Email recipient (to), subject, and message are required'
        });
      }

      // Email format validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(to)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid email format'
        });
      }

      const mailOptions = {
        to: to,
        subject: subject,
        html: `
          <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
              <h1 style="color: white; margin: 0;">${subject}</h1>
            </div>
            
            <div style="padding: 30px; background-color: #f9f9f9;">
              <h2 style="color: #333;">Hello ${username || 'User'}!</h2>
              
              <div style="background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <div style="color: #666; line-height: 1.6; font-size: 16px;">
                  ${message}
                </div>
              </div>
            </div>
            
            <div style="background-color: #333; padding: 20px; text-align: center;">
              <p style="color: #999; margin: 0; font-size: 14px;">
                Best regards,<br>
                The ${process.env.APP_NAME || 'Our Platform'} Team
              </p>
            </div>
          </div>
        `,
        text: `
          ${subject}
          
          Hello ${username || 'User'}!
          
          ${message}
          
          Best regards,
          The ${process.env.APP_NAME || 'Our Platform'} Team
        `
      };

      const result = await sendEmail(mailOptions);

      if (result.success) {
        // Optionally publish notification status
        await publishNotificationStatus({
          userId: 'manual', // No specific user ID for manual notifications
          email: to,
          type: type,
          status: 'sent'
        });

        res.status(200).json({
          success: true,
          message: 'Notification sent successfully',
          data: {
            messageId: result.messageId,
            recipient: to,
            subject: subject,
            type: type,
            timestamp: new Date().toISOString()
          }
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Failed to send notification'
        });
      }

    } catch (error) {
      console.error('Send manual notification error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Send welcome email (can be called directly)
  static async sendWelcome(req, res) {
    try {
      const { email, username } = req.body;

      

      const result = await sendWelcomeEmail({
        email,
        username
      });

      if (result.success) {
        res.status(200).json({
          success: true,
          message: 'Welcome email sent successfully',
          data: {
            messageId: result.messageId,
            recipient: email,
            type: 'welcome',
            timestamp: new Date().toISOString()
          }
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Failed to send welcome email'
        });
      }

    } catch (error) {
      console.error('Send welcome email error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Send login notification email (can be called directly)
  static async sendLoginNotification(req, res) {
    try {
      const { email, username } = req.body;

      

      const result = await sendLoginNotificationEmail({
        email,
        username,
      });

      if (result.success) {
        res.status(200).json({
          success: true,
          message: 'Login notification sent successfully',
          data: {
            messageId: result.messageId,
            recipient: email,
            type: 'login_notification',
            timestamp: new Date().toISOString()
          }
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Failed to send login notification'
        });
      }

    } catch (error) {
      console.error('Send login notification error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Test email service
  static async testEmail(req, res) {
    try {
      const result = await testEmailConnection();

      if (result.success) {
        res.status(200).json({
          success: true,
          message: 'Email service is working correctly',
          data: {
            status: 'connected',
            smtp: 'smtp.gmail.com',
            port: 587,
            timestamp: new Date().toISOString()
          }
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Email service test failed',
          error: result.message
        });
      }

    } catch (error) {
      console.error('Email test error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Get notification service status
  static async getStatus(req, res) {
    try {
      const emailTest = await testEmailConnection();
      
      res.status(200).json({
        success: true,
        message: 'Notification service status',
        data: {
          service: 'notification-service',
          status: 'running',
          emailService: {
            status: emailTest.success ? 'connected' : 'error',
            provider: 'Gmail SMTP',
            host: 'smtp.gmail.com',
            port: 587
          },
          kafka: {
            status: 'connected',
            consumerGroup: 'notification-service-group',
            subscribedTopics: ['auth-events']
          },
          uptime: process.uptime(),
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error('Get status error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Health check endpoint
  static async healthCheck(req, res) {
    try {
      const emailTest = await testEmailConnection();
      
      const isHealthy = emailTest.success;
      
      res.status(isHealthy ? 200 : 503).json({
        success: isHealthy,
        message: isHealthy ? 'Service is healthy' : 'Service is unhealthy',
        data: {
          service: 'notification-service',
          status: isHealthy ? 'healthy' : 'unhealthy',
          checks: {
            emailService: emailTest.success,
            kafkaConsumer: true // Assuming it's running if the service started
          },
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error('Health check error:', error);
      res.status(503).json({
        success: false,
        message: 'Service is unhealthy',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
}

module.exports = NotificationController;