const { Kafka } = require('kafkajs');

// Kafka configuration
const kafka = new Kafka({
  clientId: 'delivery-service',
  brokers: [process.env.KAFKA_BROKER || 'localhost:9092'],
  retry: {
    initialRetryTime: 100,
    retries: 8
  }
});

const producer = kafka.producer();
const consumer = kafka.consumer({ 
  groupId: 'delivery-service-group',
  sessionTimeout: 30000,
  heartbeatInterval: 3000
});

const TOPIC_DELIVERY = 'delivery-events';
const TOPIC_DELIVERY_STATUS = 'delivery-status-events';

// Initialize Kafka
const initKafka = async () => {
  try {
    await producer.connect();
    console.log('Kafka producer connected');
    
    await consumer.connect();
    console.log('Kafka consumer connected');
    
    // Subscribe to delivery status updates
    await consumer.subscribe({
      topics: [TOPIC_DELIVERY_STATUS],
      fromBeginning: false
    });
    
    console.log(`Subscribed to topics: ${TOPIC_DELIVERY_STATUS}`);
  } catch (error) {
    console.error('Failed to connect to Kafka:', error);
    throw error;
  }
};

// Start consuming messages
const startKafkaConsumer = async (handleDeliveryStatusUpdate) => {
  try {
    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        try {
          const messageValue = message.value.toString();
          const event = JSON.parse(messageValue);
          
          console.log('Received delivery status update:', {
            topic,
            partition,
            offset: message.offset,
            eventType: event.eventType,
            orderId: event.orderId
          });

          if (topic === TOPIC_DELIVERY_STATUS && event.eventType === 'DELIVERY_STATUS_UPDATED') {
            await handleDeliveryStatusUpdate(event);
          }
          
        } catch (error) {
          console.error('Error processing message:', error);
          console.error('Message value:', message.value.toString());
        }
      },
    });
  } catch (error) {
    console.error('Failed to start Kafka consumer:', error);
    throw error;
  }
};

// Publish delivery created event
const publishDeliveryCreatedEvent = async (deliveryData) => {
  try {
    const message = {
      topic: TOPIC_DELIVERY,
      messages: [{
        partition: 0,
        key: deliveryData.orderId.toString(),
        value: JSON.stringify({
          eventType: 'DELIVERY_CREATED',
          orderId: deliveryData.orderId,
          deliveryPersonId: deliveryData.deliveryPersonId,
          deliveryPersonName: deliveryData.deliveryPersonName,
          pickedupDate: deliveryData.pickedupDate,
          deliveredDate: deliveryData.deliveredDate,
          deliveryStatus: deliveryData.deliveryStatus,
          timestamp: new Date().toISOString(),
          serviceId: 'delivery-service'
        }),
        timestamp: Date.now().toString()
      }]
    };

    await producer.send(message);
    console.log('Delivery created event published successfully:', deliveryData.orderId);
  } catch (error) {
    console.error('Failed to publish delivery created event:', error);
    throw error;
  }
};

// Publish delivery status updated event
const publishDeliveryStatusUpdatedEvent = async (statusUpdateData) => {
  try {
    const message = {
      topic: TOPIC_DELIVERY_STATUS,
      messages: [{
        partition: 0,
        key: statusUpdateData.orderId.toString(),
        value: JSON.stringify({
          eventType: 'DELIVERY_STATUS_UPDATED',
          orderId: statusUpdateData.orderId,
          previousStatus: statusUpdateData.previousStatus,
          newStatus: statusUpdateData.newStatus,
          statusChangedBy: statusUpdateData.statusChangedBy,
          changeReason: statusUpdateData.changeReason,
          location: statusUpdateData.location,
          deliveryPersonId: statusUpdateData.deliveryPersonId,
          timestamp: new Date().toISOString(),
          serviceId: 'delivery-service'
        }),
        timestamp: Date.now().toString()
      }]
    };

    await producer.send(message);
    console.log('Delivery status updated event published successfully:', statusUpdateData.orderId);
  } catch (error) {
    console.error('Failed to publish delivery status updated event:', error);
    throw error;
  }
};

// Publish delivery cancelled event
const publishDeliveryCancelledEvent = async (deliveryData) => {
  try {
    const message = {
      topic: TOPIC_DELIVERY,
      messages: [{
        partition: 0,
        key: deliveryData.orderId.toString(),
        value: JSON.stringify({
          eventType: 'DELIVERY_CANCELLED',
          orderId: deliveryData.orderId,
          deliveryPersonId: deliveryData.deliveryPersonId,
          cancelReason: deliveryData.cancelReason,
          cancelledBy: deliveryData.cancelledBy,
          timestamp: new Date().toISOString(),
          serviceId: 'delivery-service'
        }),
        timestamp: Date.now().toString()
      }]
    };

    await producer.send(message);
    console.log('Delivery cancelled event published successfully:', deliveryData.orderId);
  } catch (error) {
    console.error('Failed to publish delivery cancelled event:', error);
    throw error;
  }
};

// Graceful shutdown
const disconnectKafka = async () => {
  try {
    await consumer.disconnect();
    console.log('Kafka consumer disconnected');
    
    await producer.disconnect();
    console.log('Kafka producer disconnected');
  } catch (error) {
    console.error('Error disconnecting from Kafka:', error);
  }
};

// Handle process termination
process.on('SIGINT', async () => {
  console.log('Shutting down Kafka...');
  await disconnectKafka();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Shutting down Kafka...');
  await disconnectKafka();
  process.exit(0);
});

module.exports = {
  initKafka,
  startKafkaConsumer,
  publishDeliveryCreatedEvent,
  publishDeliveryStatusUpdatedEvent,
  publishDeliveryCancelledEvent,
  disconnectKafka
};