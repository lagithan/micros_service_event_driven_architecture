import { transformToSOAP, callCMS } from '../controllers/cmsAdapterController.js';
import { producer } from '../config/kafkaConsumer.js';
import { CMS_UPDATE_FAILED_TOPIC } from '../config/cmsConfig.js';

export async function handleOrderCreatedEvent(message) {
  try {
    const event = JSON.parse(message.value.toString());
    const xmlPayload = transformToSOAP(event);
    await callCMS(xmlPayload);
  } catch (err) {
    console.error('CMS update failed:', err);
    await producer.send({
      topic: CMS_UPDATE_FAILED_TOPIC,
      messages: [{ value: JSON.stringify({ error: err.message, event: message.value.toString() }) }]
    });
  }
}
