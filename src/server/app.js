// @flow
import express from 'express';
import { resolve } from 'path';
import authRouter from './auth-router';
import log from '../logger';

const webClientPath = require.resolve('@wamongo/web-client');
const webClientDistPath = resolve(webClientPath, '..', '..', 'dist');

export default function createApp(path: string, dbName: string) {
  const app = express();

  app.locals.dbName = dbName;
  app.use(log.access);
  app.use('/auth', authRouter);
  app.get('/internal/project/:dbName/rules', (req, res) => {
    res.json({ rules: app.locals.rules });
  });
  app.get('/__/init.js', (req, res) => {
    res.set('Content-Type', 'application/javascript; charset=UTF-8');

    const config = {
      domain: req.get('host'),
      dbID: dbName,
      dbName,
    };
    res.send(`wamongo.initializeApp(${JSON.stringify(config)});`);
  });
  app.use('/__', express.static(webClientDistPath));
  app.use('/', express.static(resolve(path)));
  app.use('*', (req, res) => {
    res.status(404).json({ error: 'resource not found' });
  });

  return app;
}
