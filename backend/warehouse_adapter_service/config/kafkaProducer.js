const { Kafka } = require('kafkajs');

// Kafka configuration
const kafka = new Kafka({
  clientId: 'warehouse-adapter-producer',
  brokers: [process.env.KAFKA_BROKER || 'localhost:9092'],
  retry: {
    initialRetryTime: 100,
    retries: 8
  }
});

const producer = kafka.producer({
  maxInFlightRequests: 1,
  idempotent: true,
  transactionTimeout: 30000
});

// Topics to produce to
const PRODUCED_TOPICS = {
  WAREHOUSE_NOTIFICATIONS: 'warehouse-notifications'
};

// Initialize Kafka producer
const initKafkaProducer = async () => {
  try {
    await producer.connect();
    console.log('✅ Kafka producer connected successfully');
    return true;
  } catch (error) {
    console.error('❌ Failed to initialize Kafka producer:', error);
    throw error;
  }
};

// Send warehouse notification
const sendWarehouseNotification = async (eventType, data) => {
  try {
    const message = {
      eventType,
      timestamp: new Date().toISOString(),
      source: 'warehouse-adapter-service',
      ...data
    };

    console.log(`📤 Sending warehouse notification:`, {
      topic: PRODUCED_TOPICS.WAREHOUSE_NOTIFICATIONS,
      eventType,
      orderId: data.orderId,
      message: message
    });

    await producer.send({
      topic: PRODUCED_TOPICS.WAREHOUSE_NOTIFICATIONS,
      messages: [{
        key: data.orderId || null,
        value: JSON.stringify(message),
        headers: {
          eventType: eventType,
          source: 'warehouse-adapter-service'
        }
      }]
    });

    console.log(`✅ Warehouse notification sent successfully: ${eventType}`);
    return { success: true, message: 'Notification sent' };

  } catch (error) {
    console.error(`❌ Error sending warehouse notification:`, error);
    return { success: false, error: error.message };
  }
};

// Send order reached warehouse notification
const notifyOrderReachedWarehouse = async (orderId, orderDetails = {}) => {
  return await sendWarehouseNotification('ORDER_REACHED_WAREHOUSE', {
    orderId,
    status: 'inwarehouse',
    message: 'Order reached at warehouse',
    warehouse: {
      location: orderDetails.warehouseLocation || 'Main Warehouse',
      receivedBy: orderDetails.receivedBy || 'Warehouse Staff',
      receivedAt: new Date().toISOString()
    },
    ...orderDetails
  });
};

// Graceful shutdown
const closeKafkaProducer = async () => {
  try {
    await producer.disconnect();
    console.log('✅ Kafka producer disconnected successfully');
  } catch (error) {
    console.error('❌ Error disconnecting Kafka producer:', error);
  }
};

module.exports = {
  initKafkaProducer,
  sendWarehouseNotification,
  notifyOrderReachedWarehouse,
  closeKafkaProducer,
  PRODUCED_TOPICS
};