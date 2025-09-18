import { consumer } from './config/kafkaConsumer.js';
import { ORDER_CREATED_TOPIC } from './config/cmsConfig.js';
import { handleOrderCreatedEvent } from './handlers/cmsEventHandler.js';

async function start() {
  await consumer.connect();
  await consumer.subscribe({ topic: ORDER_CREATED_TOPIC, fromBeginning: false });

  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      await handleOrderCreatedEvent(message);
    }
  });
}

start().catch(console.error);
