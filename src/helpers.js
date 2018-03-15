const fs = require('fs');
const promisify = require('util').promisify;
const execFile = promisify(require('child_process').execFile);
const colors = require('colors');
const _has = require('lodash.has');
const _forEach = require('lodash.foreach');

export function errReport(message) {
  const deco = '********';
  console.log(`\n${deco}\nError\n${deco}\n${message}`.red);
  process.exit(1);
}

export function directoryExists(filePath) {
  try {
    return fs.statSync(filePath).isDirectory();
  } catch (err) {
    return false;
  }
}

export async function exec(cmd, args) {
  const { stdout, stderr } = await execFile(cmd, args);
  return stdout.trim();
}

export const jestIsGlobal = () => {
  return exec('jest', ['--version'])
    .then(result => !!result)
    .catch((error) => false)
};

export const jestIsModule = () => {
  return directoryExists('./node_modules/jest')
};

export function reportProgress(current, total) {
  if (current && total){
    process.stdout.clearLine();
    process.stdout.write(`\rProcessing ${current}/${total}`);
  }

  return {
    complete: () => {
      process.stdout.clearLine();
      process.stdout.write('\rComplete!\n');
    }
  }
}

export const output = (message) => {
  console.log(message);
}

export function matchesAnExpression(input, regExpressions){
  for (let i = 0; i < regExpressions.length; i++){
    // Compare string with all regular expressions in array
    if (regExpressions[i].test(input)){
      // The file matched one of the expressions,
      return true;
    }
  }
  return false;
}

/**
 * Deep find the values of any objects with a given key
 *
 * @param  {object} obj Object to search through
 * @param  {string} key The desired key to search for
 * @return {array}      An array of the values that matched 'key'
 */
export function deepFindKey(obj, key) {
  if (_has(obj, key))
    return [obj[key]];

  var res = [];
  _forEach(obj, function(v) {
    if (typeof v == 'object' && (v = deepFindKey(v, key)).length)
      res.push.apply(res, v);
  });
  return res;
}
