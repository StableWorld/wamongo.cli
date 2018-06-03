// @flow
import { badRequest, isBoom } from 'boom';
import log from '../logger';

type Next = (?Error)=>void

export const cors = () => (req: any, res: any, next: Next) => {
  if (req.headers.origin) {
    res.setHeader('Access-Control-Allow-Origin', req.headers.origin);
  } else {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }

  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, DELETE, OPTIONS');
  next();
};

export const noCache = () => (req: any, res: any, next: Next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  // res.setHeader('Surrogate-Control: no-store
  next();
};

export const jsonSchemaValidationError = (err: any, req: any, res: any, next: Next) => {
  if (err.name === 'JsonSchemaValidation') {
    const errors = {};
    if (err.validations.body) {
      err.validations.body.forEach(({ property, messages }) => {
        errors[property.slice('request.body.'.length)] = messages;
      });
    }
    if (err.validations.query) {
      err.validations.query.forEach(({ property, messages }) => {
        errors[property.slice('request.query.'.length)] = messages;
      });
    }
    next(badRequest('Validation failed', errors));
    return;
  }
  next(err);
};

export const boomError = (err: any, req: any, res: any, next: Next) => {
  if (isBoom(err)) {
    res.status(err.output.statusCode);
    res.json({
      error: {
        statusCode: err.output.statusCode,
        message: err.output.payload.message,
        errorType: err.output.payload.error,
        data: err.data,
      },
    });
    return;
  }
  log.error(err);
  next(err);
};
