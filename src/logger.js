// @flow

import winston from 'winston';
import onFinished from 'on-finished';

const logger = new winston.Logger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  transports: [
    new (winston.transports.Console)({
      colorize: true,
    }),
  ],
});

logger.access = (req, res, next) => {
  const start = Date.now();
  onFinished(res, (err) => {
    if (err) {
      logger.error(err);
    }
    const level = res.statusCode < 400 ? 'info' : 'warn';
    logger.log(level, {
      method: req.method,
      url: req.url,
      userAgent: req.headers['user-agent'],
      status: res.statusCode,
      size: res._headers['content-length'],
      duration: Date.now() - start,
    });
  });
  next();
};

export default logger;
