// @flow
import http from 'http';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { createEngine } from '@wamongo/server/lib';
import createApp from './app';
import log from '../logger';

type ServerArgs = { port: string, path: string, rules: string, dbName: string };

const listen = (server, port) => new Promise(next => server.listen(port, next));

export default async function serverMain({
  port, path, rules, dbName,
}: ServerArgs): Promise<(0 | 1)> {
  const app = createApp(path, dbName);
  const rulesPath = rules || resolve(path, 'rules.json');
  try {
    app.locals.rules = JSON.parse(readFileSync(rulesPath).toString());
  } catch (err) {
    log.error(err.message);
    log.error(`Rules File: ${rulesPath}`);
    return 1;
  }

  const engine = createEngine();

  const server = http.createServer(app);
  engine.attach(server);

  await listen(server, port);
  // eslint-disable-next-line
  console.log(`listening on port ${port}`);
  return 0;
}
