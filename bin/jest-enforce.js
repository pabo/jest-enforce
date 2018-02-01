#! /usr/bin/env node
var jestEnforce = require('../build/bundle.js');
const testScope = process.argv[2] || '';
jestEnforce(testScope);
