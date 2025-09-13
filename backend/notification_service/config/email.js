const nodemailer = require('nodemailer');

let transporter = null;

// Initialize email service with Gmail SMTP
const initEmailService = async () => {
  try {
    // Create transporter using Gmail SMTP
    transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false, // true for 465, false for other ports
      auth: {
        user: "swifttrackwebsite@gmail.com", // Your Gmail address
        pass: "huum zurb ixlf mrij", // Your Gmail App Password (not regular password)
      },
      tls: {
        rejectUnauthorized: false
      }
    });

    // Verify connection configuration
    await transporter.verify();
    console.log('Email service initialized successfully');
    console.log('SMTP server is ready to send emails');
    
  } catch (error) {
    console.error('Failed to initialize email service:', error);
    throw error;
  }
};

// Send email function
const sendEmail = async (mailOptions) => {
  try {
    if (!transporter) {
      throw new Error('Email service not initialized');
    }

    const defaultOptions = {
      from: "Swift Track",
    };

    const finalOptions = { ...defaultOptions, ...mailOptions };
    
    const info = await transporter.sendMail(finalOptions);
    
    console.log('Email sent successfully:', {
      messageId: info.messageId,
      to: finalOptions.to,
      subject: finalOptions.subject
    });
    
    return {
      success: true,
      messageId: info.messageId,
      response: info.response
    };
    
  } catch (error) {
    console.error('Failed to send email:', error);
    throw error;
  }
};

// Send welcome email
const sendWelcomeEmail = async (userData) => {
  const { email, firstName, lastName } = userData;
  
  const mailOptions = {
    to: email,
    subject: 'Welcome to Swift Track!',
    html: `
      <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0;">Welcome to Swift Track!</h1>
        </div>
        
        <div style="padding: 30px; background-color: #f9f9f9;">
          <h2 style="color: #333;">Hello ${firstName} ${lastName}!</h2>
          
          <p style="color: #666; line-height: 1.6; font-size: 16px;">
            Thank you for joining our platform. We're excited to have you on board!
          </p>
          
          <div style="background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #333; margin-top: 0;">Your Account Details:</h3>
            <ul style="color: #666; line-height: 1.8;">
              <li><strong>Email:</strong> ${email}</li>
              <li><strong>Registration Date:</strong> ${new Date().toLocaleDateString()}</li>
              <li><strong>Account Status:</strong> Active</li>
            </ul>
          </div>
          
          <p style="color: #666; line-height: 1.6; font-size: 16px;">
            You can now access all the features of our platform. If you have any questions or need assistance, 
            feel free to reach out to our support team.
          </p>
          
          
        </div>
        
        <div style="background-color: #333; padding: 20px; text-align: center;">
          <p style="color: #999; margin: 0; font-size: 14px;">
            Best regards,<br>
            The ${process.env.APP_NAME || 'Swift Track'} Team
          </p>
        </div>
      </div>
    `,
    text: `
      Welcome to Swift Track!

      Hello ${firstName} ${lastName}!
      
      Thank you for joining our platform. We're excited to have you on board!
      
      Your Account Details:
      - Email: ${email}
      - Registration Date: ${new Date().toLocaleDateString()}
      - Account Status: Active
      
      You can now access all the features of our platform. If you have any questions or need assistance, 
      feel free to reach out to our support team.
      
      Best regards,
      The ${process.env.APP_NAME || 'Swift Track'} Team
    `
  };

  return await sendEmail(mailOptions);
};

// Send login notification email
const sendLoginNotificationEmail = async (userData) => {
  const { email, firstName, lastName } = userData;
  
  const mailOptions = {
    to: email,
    subject: 'New Login to Your Account',
    html: `
      <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
        <div style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0;">Login Alert</h1>
        </div>
        
        <div style="padding: 30px; background-color: #f9f9f9;">
          <h2 style="color: #333;">Hello ${firstName}!</h2>
          
          <p style="color: #666; line-height: 1.6; font-size: 16px;">
            We detected a new login to your account. Here are the details:
          </p>
          
          <div style="background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #333; margin-top: 0;">Login Details:</h3>
            <ul style="color: #666; line-height: 1.8;">
              <li><strong>Email:</strong> ${email}</li>
              <li><strong>Time:</strong> ${new Date().toLocaleString()}</li>
              <li><strong>Status:</strong> Successful</li>
            </ul>
          </div>
          
          <p style="color: #666; line-height: 1.6; font-size: 16px;">
            If this wasn't you, please contact our support team immediately and consider changing your password.
          </p>
          
          <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p style="color: #856404; margin: 0; font-size: 14px;">
              <strong>Security Tip:</strong> Always log out from shared devices and use strong, unique passwords.
            </p>
          </div>
        </div>
        
        <div style="background-color: #333; padding: 20px; text-align: center;">
          <p style="color: #999; margin: 0; font-size: 14px;">
            Best regards,<br>
            The ${process.env.APP_NAME || 'Swift Track'} Security Team
          </p>
        </div>
      </div>
    `,
    text: `
      Login Alert
      
      Hello ${firstName}!
      
      We detected a new login to your account. Here are the details:
      
      Login Details:
      - Email: ${email}
      - Time: ${new Date().toLocaleString()}
      - Status: Successful
      
      If this wasn't you, please contact our support team immediately and consider changing your password.
      
      Security Tip: Always log out from shared devices and use strong, unique passwords.
      
      Best regards,
      The ${process.env.APP_NAME || 'Swift Track'} Security Team
    `
  };

  return await sendEmail(mailOptions);
};

// Test email connection
const testEmailConnection = async () => {
  try {
    if (!transporter) {
      await initEmailService();
    }
    
    await transporter.verify();
    return { success: true, message: 'Email service is working correctly' };
  } catch (error) {
    return { success: false, message: error.message };
  }
};

module.exports = {
  initEmailService,
  sendEmail,
  sendWelcomeEmail,
  sendLoginNotificationEmail,
  testEmailConnection
};