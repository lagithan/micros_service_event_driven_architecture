const { Kafka } = require('kafkajs');
const { sendWelcomeEmail, sendLoginNotificationEmail } = require('./email');

// Kafka configuration
const kafka = new Kafka({
  clientId: 'notification-service',
  brokers: [process.env.KAFKA_BROKER || 'localhost:9092'],
  retry: {
    initialRetryTime: 100,
    retries: 8
  }
});

const consumer = kafka.consumer({ 
  groupId: 'notification-service-group',
  sessionTimeout: 30000,
  heartbeatInterval: 3000
});

const TOPIC_NAME = 'auth-events';

// Initialize Kafka consumer
const initKafkaConsumer = async () => {
  try {
    await consumer.connect();
    console.log('Kafka consumer connected');

    await consumer.subscribe({
      topic: TOPIC_NAME,
      fromBeginning: false
    });

    console.log(`Subscribed to topic: ${TOPIC_NAME}`);

    // Start consuming messages
    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        try {
          const messageValue = message.value.toString();
          const authEvent = JSON.parse(messageValue);
          
          console.log('Received auth event:', {
            topic,
            partition,
            offset: message.offset,
            eventType: authEvent.eventType,
            action: authEvent.action,
            userId: authEvent.userId
          });

          await handleAuthEvent(authEvent);
          
        } catch (error) {
          console.error('Error processing message:', error);
          console.error('Message value:', message.value.toString());
        }
      },
    });

  } catch (error) {
    console.error('Failed to initialize Kafka consumer:', error);
    throw error;
  }
};

// Handle authentication events
const handleAuthEvent = async (authEvent) => {
  try {
    const { eventType, action, userId, email, firstName, lastName, timestamp } = authEvent;
    
    console.log(`Processing ${eventType} event for user ${userId}:`, action);

    switch (eventType) {
      case 'USER_REGISTERED':
        await handleUserRegistration(authEvent);
        break;
        
      case 'AUTH_SUCCESS':
        await handleAuthSuccess(authEvent);
        break;
        
      default:
        console.warn(`Unknown event type: ${eventType}`);
    }

  } catch (error) {
    console.error('Error handling auth event:', error);
    throw error;
  }
};

// Handle user registration event
const handleUserRegistration = async (eventData) => {
  try {
    const { userId, email, firstName, lastName } = eventData;
    
    console.log(`Sending welcome email to user ${userId}: ${email}`);
    
    const emailResult = await sendWelcomeEmail({
      email,
      firstName,
      lastName
    });

    if (emailResult.success) {
      console.log(`Welcome email sent successfully to ${email}`);
    } else {
      console.error(`Failed to send welcome email to ${email}`);
    }

  } catch (error) {
    console.error('Error handling user registration event:', error);
    throw error;
  }
};

// Handle authentication success event
const handleAuthSuccess = async (eventData) => {
  try {
    const { action, userId, email, firstName, lastName } = eventData;
    
    if (action === 'login') {
      console.log(`Sending login notification to user ${userId}: ${email}`);
      
      const emailResult = await sendLoginNotificationEmail({
        email,
        firstName,
        lastName
      });

      if (emailResult.success) {
        console.log(`Login notification sent successfully to ${email}`);
      } else {
        console.error(`Failed to send login notification to ${email}`);
      }
    } else if (action === 'signup') {
      // Welcome email is already sent by USER_REGISTERED event
      console.log(`Signup notification acknowledged for user ${userId}`);
    }

  } catch (error) {
    console.error('Error handling auth success event:', error);
    throw error;
  }
};

// Consumer error handling
consumer.on('consumer.crash', (error) => {
  console.error('Kafka consumer crashed:', error);
  // Implement reconnection logic here
});

consumer.on('consumer.disconnect', () => {
  console.warn('Kafka consumer disconnected');
});

consumer.on('consumer.stop', () => {
  console.log('Kafka consumer stopped');
});

// Graceful shutdown
const disconnectKafkaConsumer = async () => {
  try {
    await consumer.disconnect();
    console.log('Kafka consumer disconnected');
  } catch (error) {
    console.error('Error disconnecting Kafka consumer:', error);
  }
};

// Handle process termination
process.on('SIGINT', async () => {
  console.log('Shutting down Kafka consumer...');
  await disconnectKafkaConsumer();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Shutting down Kafka consumer...');
  await disconnectKafkaConsumer();
  process.exit(0);
});

// Publish notification status (for internal use)
const publisher = kafka.producer();

const publishNotificationStatus = async (statusData) => {
  try {
    await publisher.connect();
    
    const message = {
      topic: 'notification-status',
      messages: [{
        partition: 0,
        key: statusData.userId.toString(),
        value: JSON.stringify({
          eventType: 'NOTIFICATION_SENT',
          userId: statusData.userId,
          email: statusData.email,
          notificationType: statusData.type,
          status: statusData.status,
          timestamp: new Date().toISOString(),
          serviceId: 'notification-service'
        }),
        timestamp: Date.now().toString()
      }]
    };

    await publisher.send(message);
    console.log('Notification status published successfully');
    
    await publisher.disconnect();
  } catch (error) {
    console.error('Failed to publish notification status:', error);
  }
};

module.exports = {
  initKafkaConsumer,
  disconnectKafkaConsumer,
  publishNotificationStatus,
  handleAuthEvent,
  handleUserRegistration,
  handleAuthSuccess
};