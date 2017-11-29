import fs from 'fs';
import findInFiles from 'find-in-files';
import glob from 'glob';
var colors = require('colors');

// read config from package.json
const packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
const config = packageJson['jest-enforce'] || {};
const {
  whitelistedLibraries = [],
  debugEnabled = false,
  baseDir = './src'
} = config;

//TODO 
// const manualMocks = glob.sync(`${baseDir}/**/__mocks__/*.js`);
// const manualNodeMocks = glob.sync(`${baseDir}/../node_modules/**/__mocks__/*.js`);
// const manuallyMockedCodeFiles = manualMocks.map((mock) => { return mock.replace(/__mocks__\//, '') });
// console.log(manuallyMockedCodeFiles);

// If your module imports from 4 other modules, but your unit test only mocks 1...
// You're doing it wrong!
function checkMockImports() {
  Promise.all([
    // TODO negative lookbehind not working
    // TODO I'm getting all the .js files - not just the ones for which there are unit tests. Could optimize
    findInFiles.find('import ', baseDir, /(?:(?!spec\.jsx?$).)*\.jsx?$/),
    findInFiles.find('jest.mock', baseDir, /\.spec\.jsx?$/)
  ]).then(([codeFiles, unitTestFiles]) => {
    for (const mockFileName in unitTestFiles) {
      let realLibFileName = mockFileName.replace(/\.spec/, '');

      // If no real file matching the mock, also check if there is a .jsx source matching the .js test
      if (!codeFiles[realLibFileName]) {
        realLibFileName = mockFileName.replace(/\.spec\.jsx?$/, '.jsx');
      }
      // If there's still no file, warn about no import found
      if (!codeFiles[realLibFileName]) {
        _debug(`${mockFileName} found but no matching non-whitelisted source file.`);
        continue;
      }

      // list of jest.mocks used in the .spec.js
      const mockedLibs = new Set(unitTestFiles[mockFileName].line.map((line) => {
        return line.replace(/.*jest.mock\(['"](.*)['"].*/, '$1');
      }));

      // list of imports used in the .js
      const importedLibs = new Set(codeFiles[realLibFileName].line.map((line) => {
        return line.replace(/.*import.*from ['"](.*)['"].*/, '$1');
      }));

      // start with the imports and remove the jest.mocks and the whitelist. what's left is unmocked imports!
      const difference = _differenceWithWhitelist(importedLibs, mockedLibs, whitelistedLibraries);

      if (difference.size) {
        console.log(`unit test for ${realLibFileName} is missing these mocks: ${_prettifySet(difference)}`.yellow);
      }
    }
  }).catch((e) => {
    console.trace(`error: ${e}`.red);
  });
}

function _debug(message) {
  if (debugEnabled) {
    console.log(message.cyan);
  }
}

function _prettifySet(set) {
  return [...set].join(", ");
}

function _differenceWithWhitelist(set1, set2, whitelist) {
  const whiteSet = new Set(whitelist);

  const difference = new Set([...set1].filter(x => !set2.has(x)));

  return new Set([...difference].filter(x => !whiteSet.has(x)));
}

exports.checkMockImports = checkMockImports;
