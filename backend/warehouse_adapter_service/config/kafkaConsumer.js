const { Kafka } = require('kafkajs');

// Kafka configuration
const kafka = new Kafka({
  clientId: 'warehouse-adapter-service',
  brokers: [process.env.KAFKA_BROKER || 'localhost:9092'],
  retry: {
    initialRetryTime: 100,
    retries: 8
  }
});

const consumer = kafka.consumer({ 
  groupId: 'warehouse-adapter-group',
  sessionTimeout: 30000,
  heartbeatInterval: 3000
});

// Topics to consume
const CONSUMED_TOPICS = {
  ORDER_EVENTS: 'order-events',
  ORDER_STATUS_EVENTS: 'order-status-events'
};

// Initialize Kafka consumer
const initKafkaConsumer = async () => {
  try {
    await consumer.connect();
    console.log('Kafka consumer connected');

    // Subscribe to multiple topics
    await consumer.subscribe({
      topics: Object.values(CONSUMED_TOPICS),
      fromBeginning: false
    });

    console.log(`Subscribed to topics: ${Object.values(CONSUMED_TOPICS).join(', ')}`);

  } catch (error) {
    console.error('Failed to initialize Kafka consumer:', error);
    throw error;
  }
};

// Start consuming messages
const startKafkaConsumer = async (eventHandlers) => {
  try {
    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        try {
          const messageValue = message.value.toString();
          const event = JSON.parse(messageValue);
          
          console.log(`📥 Received Kafka message:`, {
            topic,
            partition,
            offset: message.offset,
            eventType: event.eventType,
            orderId: event.orderId || event.orderNumber,
            timestamp: event.timestamp
          });

          // Route to appropriate handler based on topic and event type
          await routeEvent(topic, event, eventHandlers);
          
        } catch (error) {
          console.error('❌ Error processing Kafka message:', error);
          console.error('Message value:', message.value.toString());
        }
      },
    });

    console.log('✅ Kafka consumer started successfully');

  } catch (error) {
    console.error('Failed to start Kafka consumer:', error);
    throw error;
  }
};

// Route events to appropriate handlers
const routeEvent = async (topic, event, handlers) => {
  const { eventType } = event;
  
  try {
    switch (topic) {
      case CONSUMED_TOPICS.ORDER_EVENTS:
        await handleOrderEvent(event, handlers);
        break;
        
      case CONSUMED_TOPICS.ORDER_STATUS_EVENTS:
        await handleOrderStatusEvent(event, handlers);
        break;
        
      default:
        console.warn(`⚠️  Unknown topic: ${topic}`);
    }
  } catch (error) {
    console.error(`❌ Error routing event ${eventType}:`, error);
    throw error;
  }
};

// Handle order events (ORDER_CREATED, ORDER_CANCELLED, etc.)
const handleOrderEvent = async (event, handlers) => {
  const { eventType } = event;
  
  console.log(`🔄 Processing order event: ${eventType}`);
  
  switch (eventType) {
    case 'ORDER_CREATED':
      if (handlers.onOrderCreated) {
        await handlers.onOrderCreated(event);
      } else {
        console.warn(`⚠️  No handler for ORDER_CREATED event`);
      }
      break;
      
    case 'ORDER_CANCELLED':
      if (handlers.onOrderCancelled) {
        await handlers.onOrderCancelled(event);
      } else {
        console.warn(`⚠️  No handler for ORDER_CANCELLED event`);
      }
      break;
      
    default:
      console.warn(`⚠️  Unhandled order event type: ${eventType}`);
  }
};

// Handle order status events (ORDER_STATUS_UPDATED)
const handleOrderStatusEvent = async (event, handlers) => {
  const { eventType } = event;
  
  console.log(`🔄 Processing order status event: ${eventType}`);
  
  switch (eventType) {
    case 'ORDER_STATUS_UPDATED':
      if (handlers.onOrderStatusUpdated) {
        await handlers.onOrderStatusUpdated(event);
      } else {
        console.warn(`⚠️  No handler for ORDER_STATUS_UPDATED event`);
      }
      break;
      
    default:
      console.warn(`⚠️  Unhandled order status event type: ${eventType}`);
  }
};

// Consumer error handling
consumer.on('consumer.crash', (error) => {
  console.error('💥 Kafka consumer crashed:', error);
  // Implement reconnection logic here
});

consumer.on('consumer.disconnect', () => {
  console.warn('🔌 Kafka consumer disconnected');
});

consumer.on('consumer.stop', () => {
  console.log('⏹️  Kafka consumer stopped');
});

consumer.on('consumer.rebalancing', () => {
  console.log('⚖️  Kafka consumer rebalancing...');
});

consumer.on('consumer.commit_offsets', (event) => {
  console.log('📍 Kafka consumer committed offsets:', event);
});

// Graceful shutdown
const disconnectKafkaConsumer = async () => {
  try {
    await consumer.disconnect();
    console.log('✅ Kafka consumer disconnected');
  } catch (error) {
    console.error('❌ Error disconnecting Kafka consumer:', error);
  }
};

// Handle process termination
process.on('SIGINT', async () => {
  console.log('🛑 Shutting down Kafka consumer...');
  await disconnectKafkaConsumer();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('🛑 Shutting down Kafka consumer...');
  await disconnectKafkaConsumer();
  process.exit(0);
});

// Health check for Kafka consumer
const getConsumerHealth = () => {
  return {
    connected: consumer._consumer ? true : false,
    subscribedTopics: Object.values(CONSUMED_TOPICS),
    groupId: 'warehouse-adapter-group'
  };
};

module.exports = {
  initKafkaConsumer,
  startKafkaConsumer,
  disconnectKafkaConsumer,
  getConsumerHealth,
  CONSUMED_TOPICS
};