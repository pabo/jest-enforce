#! /usr/bin/env node

jestEnforce = require('../build/bundle.js');

jestEnforce.checkMockImports();