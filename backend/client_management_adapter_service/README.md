# Client Management Adapter Service

## Purpose

- **Consumes:** `OrderCreated` events from Kafka
- **Translates:** Transforms the JSON event payload into a SOAP/XML message
- **Calls:** The legacy CMS's SOAP API
- **Publishes:** `CMSUpdateFailed` event if the call fails (for retry/alert)

## Setup

1. Install dependencies:
   ```sh
   npm install
   ```
2. Configure `.env` as needed.
3. Start the service:
   ```sh
   npm start
   ```

## Environment Variables

- `KAFKA_BROKER`: Kafka broker address
- `ORDER_CREATED_TOPIC`: Kafka topic to consume
- `CMS_UPDATE_FAILED_TOPIC`: Topic to publish on failure
- `CMS_SOAP_WSDL`: WSDL URL for the legacy CMS SOAP API

## How it works

- Listens for `OrderCreated` events on Kafka
- Converts the event to SOAP/XML
- Calls the CMS SOAP API
- On failure, publishes a `CMSUpdateFailed` event
