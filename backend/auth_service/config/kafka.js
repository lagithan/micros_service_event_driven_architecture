const { Kafka } = require('kafkajs');

// Kafka configuration
const kafka = new Kafka({
  clientId: 'auth-service',
  brokers: [process.env.KAFKA_BROKER || 'localhost:9092'],
  retry: {
    initialRetryTime: 100,
    retries: 8
  }
});

const producer = kafka.producer();
const TOPIC_NAME = 'auth-events';

// Initialize Kafka
const initKafka = async () => {
  try {
    await producer.connect();
    console.log('Kafka producer connected');
  } catch (error) {
    console.error('Failed to connect to Kafka:', error);
    throw error;
  }
};

// Publish authentication success event
const publishAuthEvent = async (eventData) => {
  try {
    const message = {
      topic: TOPIC_NAME,
      messages: [{
        partition: 0,
        key: eventData.userId.toString(),
        value: JSON.stringify({
          eventType: 'AUTH_SUCCESS',
          userId: eventData.userId,
          email: eventData.email,
          username: eventData.username || eventData.name || eventData.fullName || null,
          firstName: eventData.firstName,
          lastName: eventData.lastName,
          action: eventData.action, // 'login' or 'signup'
          timestamp: new Date().toISOString(),
          serviceId: 'auth-service'
        }),
        timestamp: Date.now().toString()
      }]
    };

    await producer.send(message);
    console.log('Auth event published successfully:', eventData.action);
  } catch (error) {
    console.error('Failed to publish auth event:', error);
    throw error;
  }
};

// Publish user registration event
const publishUserRegistrationEvent = async (userData) => {
  try {
    const message = {
      topic: TOPIC_NAME,
      messages: [{
        partition: 0,
        key: userData.userId.toString(),
        value: JSON.stringify({
          eventType: 'USER_REGISTERED',
          userId: userData.userId,
          email: userData.email,
          username: userData.username || userData.name || userData.fullName || null,
          firstName: userData.firstName,
          lastName: userData.lastName,
          timestamp: new Date().toISOString(),
          serviceId: 'auth-service'
        }),
        timestamp: Date.now().toString()
      }]
    };

    await producer.send(message);
    console.log('User registration event published successfully');
  } catch (error) {
    console.error('Failed to publish user registration event:', error);
    throw error;
  }
};

// Graceful shutdown
const disconnectKafka = async () => {
  try {
    await producer.disconnect();
    console.log('Kafka producer disconnected');
  } catch (error) {
    console.error('Error disconnecting from Kafka:', error);
  }
};

// Handle process termination
process.on('SIGINT', async () => {
  console.log('Shutting down Kafka producer...');
  await disconnectKafka();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Shutting down Kafka producer...');
  await disconnectKafka();
  process.exit(0);
});

module.exports = {
  initKafka,
  publishAuthEvent,
  publishUserRegistrationEvent,
  disconnectKafka
};