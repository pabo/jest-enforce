// const recursive = require('recursive-readdir');
// const readline = require('readline');
var findInFiles = require('find-in-files');

// it's ok not to mock these
const whitelistedLibs = [
  'react',
  'react-redux',
  'styled-components',
  'lodash',
  'import {', //TODO this is because I don't yet handle multi line imports
];

function checkMockImports() {

Promise.all([
  findInFiles.find('jest.mock', './src', /\.spec\.js$/),
  // TODO negative lookbehind not working
  // TODO I'm getting all the .js files - not just the ones for which there are unit tests. Could optimize
  findInFiles.find('import ', './src', /(?:(?!spec\.js$).)*\.js$/) 
]).then(([unitTestFiles, codeFiles]) => {
  for (const mockFileName in unitTestFiles) {
    const realLibFileName = mockFileName.replace(/\.spec/, '');

    const mockedLibs = new Set(unitTestFiles[mockFileName].line.map((line) => {
      return line.replace(/.*jest.mock\('(.*)'.*/, '$1');
    }));

    const importedLibs = new Set(codeFiles[realLibFileName].line.map((line) => {
      // import analytics from '../../utils/analytics';
      return line.replace(/.*import.*from ['"](.*)['"].*/, '$1');
    }));


    const difference = _differenceWithWhiteList(importedLibs, mockedLibs, whitelistedLibs);
    if (difference.size) {
      console.log(`${realLibFileName}'s spec is missing these mocks:`, difference );
    }
  }
}).catch((e) => {
  console.log(`error: ${e}`);
});
}

function _differenceWithWhiteList(set1, set2, whitelist) {
  whiteSet = new Set([...whitelist]);

  const difference = new Set([...set1].filter(x => !set2.has(x)));

  return new Set([...difference].filter(x => !whiteSet.has(x)));
}

exports.checkMockImports = checkMockImports;