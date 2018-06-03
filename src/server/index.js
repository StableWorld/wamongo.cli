// @flow
import http from 'http';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { createEngine } from '@wamongo/server/lib';
import { setPerms } from '@wamongo/server/lib/perms/store';
import createApp from './app';
import log from '../logger';

type ServerArgs = { port: number, path: string, rules: string, dbName: string };

async function loadAndSetPerms(rules: string) {
  log.info(`Loading Rules from ${rules}`);
  let perms;
  try {
    perms = JSON.parse(readFileSync(rules).toString());
  } catch (err) {
    log.error(err.message);
    log.error(`Rules File: ${rules}`);
    return 1;
  }
  await setPerms('example', perms);
  return 0;
}

const listen = (server, port) => new Promise(next => server.listen(port, next));

export default async function serverMain({
  port, path, rules, dbName,
}: ServerArgs): Promise<(0 | 1)> {
  if (await loadAndSetPerms(rules || resolve(path, 'rules.json'))) {
    return 1;
  }

  const engine = createEngine();
  const app = createApp(path, dbName);
  const server = http.createServer(app);
  engine.attach(server);

  await listen(server, port);
  // eslint-disable-next-line
  console.log(`listening on port ${port}`);
  return 0;
}
