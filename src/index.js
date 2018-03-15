const fs = require('fs');
const path = require('path');
const xml2js = require('xml2js');
const xmlParser = new xml2js.Parser();
const findRoot = require('find-root');

import {
  errReport,
  exec,
  jestIsGlobal,
  jestIsModule,
  reportProgress,
  output,
  matchesAnExpression,
  deepFindKey
} from './helpers.js';

// Find the first directory that contains a package.json
// We will now use that as the root project directory
const projectRoot = findRoot(process.env.PWD);

// Move our working directory to root
// so any relative paths in package.json are correct
process.chdir(projectRoot);

// Get package.json from project root
// Grab settings for jest-enforce
// Grab settings for jest
const packageJson = JSON.parse(fs.readFileSync(projectRoot + '/package.json', 'utf8'));
const jestEnforceConfig = packageJson['jest-enforce'] || {};
const jestConfig = packageJson['jest'] || {};

// Make variables with default values from jest-enforce settings
const {
  whitelist = [],
  printList = true,
  testNameFormat = '(\\.spec|\\.test)'
} = jestEnforceConfig;

// If coverage directory is not defined, set it to default
if (!jestConfig.coverageDirectory){
  jestConfig.coverageDirectory = path.join(projectRoot + '/coverage');
}
const pathToCoverageFile = path.join(jestConfig.coverageDirectory + '/clover.xml');
// Convert whitelist to array of regular expressions
const regexWhiteList = whitelist.map((expression) => {
  return new RegExp(expression, 'i')
});
// We only need the clover reporter, overwrite any others for performance
jestConfig.coverageReporters = ['clover']


/**
 * Passes test scope to _getApplicableTests
 * If tests are found, calls jest with file and custom config
 * Reports progress as each test is run and coverage is collected
 * Re-names paths relative to the project, then sends report to output
 *
 * @param  {string} testScope Regular expression for desired jest files
 */
async function logExtraneousCoverage(testScope) {
  _getApplicableTests(testScope).then((testFiles) => {
    if (!testFiles.length){
      errReport(`No test files found with test scope '${testScope}'`);
    }

    output(`${testFiles.length} file${'s'.repeat(testFiles.length != 1)} found`)

    let xmlStrings = []
    // For each test file found, add a promise to the chain
    testFiles.reduce((promiseChain,filePath, index) => {
      return promiseChain.then(() => {
        return new Promise((resolve, reject) => {
          // Print progress to console
          reportProgress(index + 1, testFiles.length);

          // Clean up past coverage
          if (fs.existsSync(pathToCoverageFile)) {
            fs.unlinkSync(pathToCoverageFile);
          }

          // Call the test with our custom jest config
          exec('jest',[filePath, '--config=' + JSON.stringify(jestConfig), '--coverage',])
            .then(() => {
              let data;
              // Read the coverage file
              try {
                data = fs.readFileSync(pathToCoverageFile, 'utf8');
              } catch (e) {
                errReport(`Could not read coverage file at ${pathToCoverageFile}: ${e}`);
                reject();
              }
              // We found the XML data, so parse it and add it to our collection
              xmlParser.parseString(data, (err, xmlString)=>{
                resolve(xmlStrings.push({filePath, xmlString}));
              });
            }).catch((err) => {
              errReport(`Running Jest on ${filePath} failed: \n\n${err}`);
            });
        });
      });
    }, Promise.resolve([])).then(() => {
      // Async work is done
      // Print completed progress to console
      reportProgress().complete();

      // Parse all of that XML - get a report on the touched files
      // fileReports = [{filePath, report: touchedFilesReport},...]
      const testReports = xmlStrings.map(_parseXmlReport);

      // Clean up fileReports so that all file paths are relative to the project
      const formattedTestReports = testReports.map((testReport) => {
        // Clean path of test file
        let filePath = _getPathRelativeToProject(testReport.filePath);
        // For each file touched in the report
        let report = testReport.report.map((touchedFile) => {
          // Clean the path to that file
          touchedFile.path = _getPathRelativeToProject(touchedFile.path);
          return touchedFile
        })

        return {filePath, report}
      })

      // Touched does not necessarily mean coverage, so we must explicitly check for coverage
      const coverageResults = formattedTestReports.map(_getExtraneous);

      // Print findings to console
      const totalNumExtraneous = coverageResults.map(_printCoverageReport).reduce((value, current) => value + current);

      if (totalNumExtraneous > 0){
        process.exit(1);
      } else {
        process.exit(0);
      }
    }).catch((err) => {
      output(err);
    });
    // _collectFileCoverage(testFiles, 0);
  }).catch((err) => {
    output(err);
  });
}

/**
 * Determines the location of jest module,
 * calls it with desired tests based on regular expression,
 * returns an array of paths to applicable test files
 *
 * @param  {string} testScope Regular expression for desired jest files
 * @return {array}            Absolute paths to test files testScope regex
 */
async function _getApplicableTests(testScope) {
  return Promise.all([jestIsGlobal(), jestIsModule()])
    .then(([isGlobal, isModule]) => {
      // Get Jest spec files as stdout string
      if (isGlobal) {
        return exec('jest', [testScope, '--listTests']);
      } else if (isModule) {
        return exec('node', [projectRoot + '/node_modules/jest/bin/jest.js', testScope, '--listTests']);
      } else {
        errReport('Could not find Jest installed globally or as a module. Try \'npm i -g jest-cli\'.');
      }
    }).then((testFiles) => {
      return testFiles.split('\n').filter((fileName) => {
        return fileName.length
      });
    }).catch((err) => {
      output(err);
    })
}


/**
 * Parses the XML, grabs coverage information, and converts to JSON format
 *
 * @param  {string} filePath  The path to the test file that is the source of the coverage
 * @param  {string} xmlString String of JSON representing xml file
 * @return {object}           filePath and its respective coverage report
 */
function _parseXmlReport ({filePath, xmlString}) {
  let xmlJson = JSON.parse(JSON.stringify(xmlString));
  let touchedFiles = deepFindKey(xmlJson, 'file')[0]; // Returns an array containing an array
  let touchedFilesReport = [];

  touchedFiles.forEach((file) => {
    let path = file['$'].path;
    let metrics = file.metrics[0]['$'];
    touchedFilesReport.push({path, metrics});
  });

  return {filePath, report: touchedFilesReport};
}

function _getPathRelativeToProject(filePath){
  return filePath.replace(projectRoot, '');
}

/**
 * Checks an array of touched files and removes them if they are excluded by the whiteList
 * If not, and they received coverage, they are pushed to an array of extraneous files
 *
 * @param  {type} filePath description
 * @param  {type} report   description
 * @return {type}           description
 */
function _getExtraneous({filePath, report}){
  // Assuming the file ends with .spec.js(x), .test.js(x), or similar, remove that piece
  const currentFileRegExp = new RegExp(filePath.replace(new RegExp(testNameFormat),''), 'i');
  let expectedFiles = [currentFileRegExp, ...regexWhiteList];

  const extraneousFiles = report.reduce((prev, currentFile) => {
    // Check if the file matches any of the expected patterns
    const isWhitelisted = matchesAnExpression(currentFile.path, expectedFiles);
    // If it does not match the whitelist and has gotten coverage,
    // push it to list of extraneous coverage
    if (!isWhitelisted) {
      const hasCoverage = parseInt(currentFile.metrics.coveredstatements) ||
                            parseInt(currentFile.metrics.coveredconditionals) ||
                            parseInt(currentFile.metrics.coveredmethods);
      if (hasCoverage) {
        prev.push(currentFile.path);
      }
    }

    return prev
  }, []);

  return {filePath, extraneousFiles}
}


/**
 * Sends color formatted warnings to output function
 *
 * @param  {string} filePath        Project relative path to the test file
 * @param  {array}  extraneousFiles An array of paths to files with extraneous coverage
 */
function _printCoverageReport({filePath, extraneousFiles}){
  if (extraneousFiles.length > 0) {
    output('\n✘ '.red.bold + `${filePath}`);
    if (printList){
      output(`${extraneousFiles.length} unexpected file${'s'.repeat(extraneousFiles.length != 1)} with coverage:`.red);
      extraneousFiles.forEach((file, index) => {
        output(`${index + 1} - ${file}`.red);
      });
    } else {
      output(`${extraneousFiles.length} unexpected file${'s'.repeat(extraneousFiles.length != 1)} with coverage`.red);
    }
  } else {
    output('\n✓ '.green.bold + `${filePath}`);
  }

  return extraneousFiles.length
}

module.exports = logExtraneousCoverage;
