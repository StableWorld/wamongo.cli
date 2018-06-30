process.env.WEBTOKEN_ALGORITHM = 'HS256';
process.env.AUTH_SERVER = 'http://127.0.0.1:4444';
require('babel-register');
require('./src/command');
