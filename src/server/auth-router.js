// @flow
import { ObjectId } from 'bson';
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
      email, uid: user._id.toString(), displayName: email,
    };
    const tokenData = {
      dbName, u: user._id.toString(),
    };
    const accessToken = await signDevOnly(tokenData);

    res.cookie('refresh-token', accessToken);
    res.cookie('access-token', accessToken);
    res.json(({ loginOk: true, dbName, currentUser }: LoginResponse));
  }),
);

router.post(
  '/logout',
  (req, res) => {
    res.cookie('refresh-token', '');
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
    const tokenData = { dbName, u: uid.toString() };

    const accessToken = await signDevOnly(tokenData);

    res.cookie('refresh-token', accessToken);
    res.cookie('access-token', accessToken);
    res.json(({ registerOk: true, dbName, currentUser }: RegisterResponse));
  }),
);

router.post(
  '/refresh',
  validate({ query: refreshSchema }),
  asm(async (req, res) => {
    let { dbName } = req.query;
    const refreshToken = req.cookies['refresh-token'];
    let u = ObjectId();
    if (refreshToken) {
      try {
        const tokenData = await verify(refreshToken);
        log.debug('Found refreshToken', tokenData);
        try {
          u = ObjectId(tokenData.u) || u; // eslint-disable-line prefer-destructuring
        } catch (err) {
          log.error(err);
        }
        dbName = tokenData.dbName || dbName; // eslint-disable-line prefer-destructuring
      } catch (err) {
        log.error(err);
      }
    } else {
      const refreshTokenData = { u: u.toHexString(), dbName };
      const newRefreshToken = await signDevOnly(refreshTokenData);
      res.cookie('refresh-token', newRefreshToken);
    }
    const tokenData = { u: u.toHexString(), dbName };
    log.debug('Refreshing accessToken', tokenData);
    const accessToken = await signDevOnly(tokenData);

    res.cookie('access-token', accessToken);

    const currentUser: CurrentUser = {
      anonymous: true,
      displayName: 'anonymous',
      email: 'anonymous@anonymous.com',
      uid: u,
      dbName,
    };

    res.json(({ refreshOk: true, dbName, currentUser }: RefreshResponse));
  }),
);

router.use(jsonSchemaValidationError);
router.use(boomError);
