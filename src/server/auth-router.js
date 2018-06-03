// @flow
import { Router } from 'express';
import cookieParser from 'cookie-parser';
import bodyParser from 'body-parser';
import { forbidden } from 'boom';
import { validate } from 'express-jsonschema';

import { verify } from '@wamongo/server/lib/webtoken';

import type {
  RefreshResponse,
  RegisterResponse,
  LoginResponse,
  LogoutResponse,
  CurrentUser,
} from '@wamongo/interfaces';

import {
  loginSchema,
  registerSchema,
  refreshSchema,
} from '@wamongo/interfaces/schemas';

import { getClient } from '../db';
import log from '../logger';
import { signDevOnly } from '../webtoken';
import { jsonSchemaValidationError, boomError, cors, noCache } from './middleware';

const router = Router();

router.use(cors());
router.use(noCache());
router.use(bodyParser.json());
router.use(cookieParser());
router.options('*', (req, res) => {
  res.json({ ok: true });
});

export default router;

type Next = (?Error)=>void
type Fn = (req: any, res: any, next: Next)=> Promise<void>;
const asm = (fn: Fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

async function addUser(dbName: string, userObject: any) {
  const client = await getClient();
  await client.db(dbName).collection('_users').insertOne(userObject);
  return userObject._id;
}

async function getUser(dbName: string, email: string, password: string) {
  const client = await getClient();
  return client.db(dbName).collection('_users').findOne({ email, password });
}

router.post(
  '/login',
  validate({ body: loginSchema }),
  asm(async (req, res) => {
    const { email, password, dbName } = req.body;
    const user = await getUser(dbName, email, password);
    if (!user) {
      throw forbidden('Bad Login', { email: ['User email or password does not exist'] });
    }
    const currentUser = {
      email, dbName, uid: user._id.toString(), displayName: email,
    };
    const accessToken = await signDevOnly(currentUser);

    res.cookie('access-token', accessToken);
    res.json(({ loginOk: true, dbName, currentUser }: LoginResponse));
  }),
);

router.post(
  '/logout',
  (req, res) => {
    res.cookie('access-token', '');
    res.json(({ logoutOk: true }: LogoutResponse));
  },
);

router.post(
  '/register',
  validate({ body: registerSchema }),
  asm(async (req, res) => {
    const { email, password, dbName } = req.body;

    const uid = await addUser(dbName, { email, password });
    const currentUser = {
      uid: uid.toString(), dbName, email, displayName: email,
    };

    const accessToken = await signDevOnly(currentUser);

    res.cookie('access-token', accessToken);
    res.json(({ registerOk: true, dbName, currentUser }: RegisterResponse));
  }),
);

router.post(
  '/refresh',
  validate({ query: refreshSchema }),
  asm(async (req, res) => {
    const { dbName } = req.body;
    const accessToken = req.cookies['access-token'];
    let currentUser: CurrentUser = {
      anonymous: true, displayName: 'anonymous', email: '', uid: '',
    };
    if (accessToken) {
      log.debug('accessToken');
      try {
        currentUser = await verify(accessToken);
      } catch (err) {
        log.error(err);
      }
    } else {
      log.debug('no accessToken');
    }
    res.json(({ refreshOk: true, dbName, currentUser }: RefreshResponse));
  }),
);

router.use(jsonSchemaValidationError);
router.use(boomError);
