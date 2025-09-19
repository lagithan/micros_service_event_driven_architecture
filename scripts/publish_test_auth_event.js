const { Kafka } = require('kafkajs');

(async () => {
  try {
    const kafka = new Kafka({ clientId: 'test-publisher', brokers: [process.env.KAFKA_BROKER || 'localhost:9092'] });
    const producer = kafka.producer();
    await producer.connect();
    console.log('Connected to Kafka');

    const event = {
      eventType: 'AUTH_SUCCESS',
      userId: 12345,
      email: 'testuser@example.com',
      username: 'testuser',
      action: 'login',
      timestamp: new Date().toISOString(),
      serviceId: 'test-script'
    };

    await producer.send({
      topic: 'auth-events',
      messages: [{ key: String(event.userId), value: JSON.stringify(event) }]
    });

    console.log('Published test auth event:', event);
    await producer.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Failed to publish test event:', err);
    process.exit(1);
  }
})();
