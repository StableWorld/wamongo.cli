// @flow
import jwt from 'jsonwebtoken';
import type { TokenData } from '@wamongo/interfaces';

import { PUBLIC_KEY, WEBTOKEN_ALGORITHM } from '@wamongo/server/lib/defaults';

export const publicKey = Buffer.from(PUBLIC_KEY, 'base64').toString();


export function signDevOnly(data: TokenData, options: Object = {}) : Promise<string> {
  return new Promise((resolve, reject) => {
    jwt.sign(
      data,
      publicKey, // using publicKey here only as a simple asymetric secret
      Object.assign({}, options, { algorithm: WEBTOKEN_ALGORITHM }),
      (err, token) => { if (err) reject(err); else resolve(token); },
    );
  });
}
