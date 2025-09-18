import { Kafka } from 'kafkajs';
import dotenv from 'dotenv';
dotenv.config();

const KAFKA_BROKER = process.env.KAFKA_BROKER || 'localhost:9092';
const kafka = new Kafka({ brokers: [KAFKA_BROKER] });

export const consumer = kafka.consumer({ groupId: 'client-management-adapter' });
export const producer = kafka.producer();
