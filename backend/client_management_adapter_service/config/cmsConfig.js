import dotenv from 'dotenv';
dotenv.config();

export const ORDER_CREATED_TOPIC = process.env.ORDER_CREATED_TOPIC || 'OrderCreated';
export const CMS_UPDATE_FAILED_TOPIC = process.env.CMS_UPDATE_FAILED_TOPIC || 'CMSUpdateFailed';
export const CMS_SOAP_WSDL = process.env.CMS_SOAP_WSDL || 'http://legacy-cms/wsdl';
