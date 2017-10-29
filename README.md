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
