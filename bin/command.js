#!/usr/bin/env node
process.env.WEBTOKEN_ALGORITHM = 'HS256';
require('../lib/command');
