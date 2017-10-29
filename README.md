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

You could use it in code but right now it just spits out console.logs

```
const jestEnforce = require('jest-enforce');

jestEnforce.checkMockImports();
```

### Functionality
`jestEnforce.checkMockImports()` inspects all `.spec` files under `./src` and tells you if you are not mocking modules you should be mocking.
