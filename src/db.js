// @flow
import { MongoClient } from 'mongodb';
import { MONGO_URL, MONGO_OPTIONS } from '@wamongo/server/lib/defaults';
import log from './logger';

let client = null;

export async function getClient() {
  if (!client) {
    client = await MongoClient.connect(MONGO_URL, MONGO_OPTIONS);
    log.info(`Connected to mongo @ ${MONGO_URL}`);
  }

  return client;
}

export function close() {
  if (client) {
    log.info('Closing mongo connection');
    client.close();
  }
  client = null;
}
