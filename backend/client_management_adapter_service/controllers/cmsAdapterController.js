import soap from 'soap';
import { Builder } from 'xml2js';
import { CMS_SOAP_WSDL } from '../config/cmsConfig.js';

export function transformToSOAP(event) {
  // Example transformation, adjust to your CMS schema
  const builder = new Builder({ rootName: 'OrderCreated' });
  return builder.buildObject(event);
}

export async function callCMS(xmlPayload) {
  return new Promise((resolve, reject) => {
    soap.createClient(CMS_SOAP_WSDL, (err, client) => {
      if (err) return reject(err);
      client.OrderCreated({ xml: xmlPayload }, (err, result) => {
        if (err) return reject(err);
        resolve(result);
      });
    });
  });
}
