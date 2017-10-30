// const recursive = require('recursive-readdir');
// const readline = require('readline');
const fs = require('fs');
const findInFiles = require('find-in-files');

// read config from package.json
const packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
const config = packageJson['jest-enforce'];
const { whitelistedLibraries = [] } = config;

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


      const difference = _differenceWithWhiteList(importedLibs, mockedLibs, whitelistedLibraries);
      if (difference.size) {
        console.log(`${realLibFileName}'s spec is missing these mocks: ${_prettifySet(difference)}`);
      }
    }
  }).catch((e) => {
    console.trace(`error: ${e}`);
  });
}

function _prettifySet(set) {
  return [...set].join(", ");
}

function _differenceWithWhiteList(set1, set2, whitelist) {
  const whiteSet = new Set(whitelist);

  const difference = new Set([...set1].filter(x => !set2.has(x)));

  return new Set([...difference].filter(x => !whiteSet.has(x)));
}

exports.checkMockImports = checkMockImports;