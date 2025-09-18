const { Kafka } = require('kafkajs');

// Kafka configuration
const kafka = new Kafka({
  clientId: 'order-service',
  brokers: [process.env.KAFKA_BROKER || 'localhost:9092'],
  retry: {
    initialRetryTime: 100,
    retries: 8
  }
});

const producer = kafka.producer();
const consumer = kafka.consumer({ 
  groupId: 'order-service-group',
  sessionTimeout: 30000,
  heartbeatInterval: 3000
});

const TOPIC_ORDERS = 'order-events';
const TOPIC_ORDER_STATUS = 'order-status-events';
const TOPIC_WAREHOUSE_NOTIFICATIONS = 'warehouse-notifications';

// Initialize Kafka
const initKafka = async () => {
  try {
    await producer.connect();
    console.log('Kafka producer connected');
    
    await consumer.connect();
    console.log('Kafka consumer connected');
    
    // Subscribe to order status updates and warehouse notifications
    await consumer.subscribe({
      topics: [TOPIC_ORDER_STATUS, TOPIC_WAREHOUSE_NOTIFICATIONS],
      fromBeginning: false
    });
    
    console.log(`Subscribed to topics: ${TOPIC_ORDER_STATUS}, ${TOPIC_WAREHOUSE_NOTIFICATIONS}`);
  } catch (error) {
    console.error('Failed to connect to Kafka:', error);
    throw error;
  }
};

// Start consuming messages
const startKafkaConsumer = async (handleOrderStatusUpdate, handleWarehouseNotification) => {
  try {
    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        try {
          const messageValue = message.value.toString();
          const event = JSON.parse(messageValue);
          
          console.log('Received Kafka message:', {
            topic,
            partition,
            offset: message.offset,
            eventType: event.eventType,
            orderId: event.orderId
          });

          if (topic === TOPIC_ORDER_STATUS && event.eventType === 'ORDER_STATUS_UPDATED') {
            await handleOrderStatusUpdate(event);
          }
          else if (topic === TOPIC_WAREHOUSE_NOTIFICATIONS) {
            console.log('📦 Processing warehouse notification:', event.eventType);
            if (handleWarehouseNotification) {
              await handleWarehouseNotification(event);
            }
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

// Publish order created event
const publishOrderCreatedEvent = async (orderData) => {
  try {
    const message = {
      topic: TOPIC_ORDERS,
      messages: [{
        partition: 0,
        key: orderData.orderId.toString(),
        value: JSON.stringify({
          eventType: 'ORDER_CREATED',
          orderId: orderData.orderId,
          orderNumber: orderData.orderNumber,
          trackingNumber: orderData.trackingNumber,
          userId: orderData.userId,
          clientId: orderData.clientId,
          senderName: orderData.senderName,
          receiverName: orderData.receiverName,
          receiverPhone: orderData.receiverPhone,
          pickupAddress: orderData.pickupAddress,
          destinationAddress: orderData.destinationAddress,
          orderStatus: orderData.orderStatus,
          packageDetails: orderData.packageDetails,
          estimatedDeliveryDate: orderData.estimatedDeliveryDate,
          timestamp: new Date().toISOString(),
          serviceId: 'order-service'
        }),
        timestamp: Date.now().toString()
      }]
    };

    await producer.send(message);
    console.log('Order created event published successfully:', orderData.orderId);
  } catch (error) {
    console.error('Failed to publish order created event:', error);
    throw error;
  }
};

// Publish order status updated event
const publishOrderStatusUpdatedEvent = async (statusUpdateData) => {
  try {
    const message = {
      topic: TOPIC_ORDER_STATUS,
      messages: [{
        partition: 0,
        key: statusUpdateData.orderId.toString(),
        value: JSON.stringify({
          eventType: 'ORDER_STATUS_UPDATED',
          orderId: statusUpdateData.orderId,
          orderNumber: statusUpdateData.orderNumber,
          trackingNumber: statusUpdateData.trackingNumber,
          previousStatus: statusUpdateData.previousStatus,
          newStatus: statusUpdateData.newStatus,
          statusChangedBy: statusUpdateData.statusChangedBy,
          changeReason: statusUpdateData.changeReason,
          location: statusUpdateData.location,
          driverId: statusUpdateData.driverId,
          timestamp: new Date().toISOString(),
          serviceId: 'order-service'
        }),
        timestamp: Date.now().toString()
      }]
    };

    await producer.send(message);
    console.log('Order status updated event published successfully:', statusUpdateData.orderId);
  } catch (error) {
    console.error('Failed to publish order status updated event:', error);
    throw error;
  }
};

// Publish order cancelled event
const publishOrderCancelledEvent = async (orderData) => {
  try {
    const message = {
      topic: TOPIC_ORDERS,
      messages: [{
        partition: 0,
        key: orderData.orderId.toString(),
        value: JSON.stringify({
          eventType: 'ORDER_CANCELLED',
          orderId: orderData.orderId,
          orderNumber: orderData.orderNumber,
          trackingNumber: orderData.trackingNumber,
          userId: orderData.userId,
          cancelReason: orderData.cancelReason,
          cancelledBy: orderData.cancelledBy,
          timestamp: new Date().toISOString(),
          serviceId: 'order-service'
        }),
        timestamp: Date.now().toString()
      }]
    };

    await producer.send(message);
    console.log('Order cancelled event published successfully:', orderData.orderId);
  } catch (error) {
    console.error('Failed to publish order cancelled event:', error);
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
  publishOrderCreatedEvent,
  publishOrderStatusUpdatedEvent,
  publishOrderCancelledEvent,
  disconnectKafka
};