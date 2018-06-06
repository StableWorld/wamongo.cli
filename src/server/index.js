// @flow
import http from 'http';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { createEngine } from '@wamongo/server/lib';
import { setRules } from '@wamongo/server/lib/rules/store';
import createApp from './app';
import log from '../logger';

type ServerArgs = { port: string, path: string, rules: string, dbName: string };

async function loadAndSetRules(rulesPath: string) {
  log.info(`Loading Rules from ${rulesPath}`);
  let rules;
  try {
    rules = JSON.parse(readFileSync(rulesPath).toString());
  } catch (err) {
    log.error(err.message);
    log.error(`Rules File: ${rulesPath}`);
    return 1;
  }
  await setRules('example', rules);
  return 0;
}

const listen = (server, port) => new Promise(next => server.listen(port, next));

export default async function serverMain({
  port, path, rules, dbName,
}: ServerArgs): Promise<(0 | 1)> {
  if (await loadAndSetRules(rules || resolve(path, 'rules.json'))) {
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
