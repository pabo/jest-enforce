const fs = require('fs');
const promisify = require('util').promisify;
const execFile = promisify(require('child_process').execFile);
const colors = require('colors');

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
