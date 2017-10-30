## jest-enforce

### Install
```
npm intall --save-dev jest-enforce
```

### Use
I'm using it on the command line
```
$ jest-enforce
```

### Functionality
The command line util calls `jestEnforce.checkMockImports()`, which inspects all `.spec` files under `./src` and tells you if you are not mocking modules you should be mocking.

### Configuration
You can add a configuration to your `package.json` file:
```
"jest-enforce": {
  "whitelistedLibraries": [
    "react",
    "react-redux",
    "styled-components",
    "lodash",
    "import {", //TODO this is because I don't yet handle multi line imports
  ] 
}
```

I like to add jest-enforce to the end of my `npm run test` command:
```
scripts": {
    "start": "node scripts/start.js",
    "build-react": "node scripts/build.js",
    "build": "rm -rf plugin-build && webpack --config build-utils/webpack.build.plugin.js && npm run test",
    "test": "node scripts/test.js --coverage && jest-enforce",
  },
```


### TODO
- [x] allow configuration
  - [x] what imports are OK to ignore
- [ ] fix multiline import statements
- [ ] colorize output