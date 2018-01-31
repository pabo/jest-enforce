## jest-enforce
Are you mocking me?

When you run your unit tests, what does your dependency tree look like? Are your unit tests pulling in the actual dependencies of your modules, thereby making them brittle?

Use jest-enforce to ensure you're mocking all of your dependencies.

## Install
`npm intall --save-dev jest-enforce`

## Use
`jest-enforce <regexForTestFiles>`

## Functionality
The command line util calls `jest <regexForTestFiles> --listTests`, which lists all of the applicable test files to be run. It then runs each of these tests (synchronously, for now) using your jest configuration in package.json (if applicable) and collects their coverage reports. If the coverage report includes files that are not whitelisted for coverage, jest-enforce will warn you via console print out.

<strong>NOTE:</strong> If ANY of your tests fail, jest-enforce will as well. All tests must pass in order for this tool to catch extraneous coverage.

## Configuration
You can add a configuration to your package.json file. Here's an example:
```
"jest-enforce": {
  "whitelist": ["sourceOfTruth.js$", "src/js/config/**/*.jsx"],
  "printList": true,
  "testNameFormat": "(\\.spec|\\.test)"
}
```

Keep in mind that JSON does not support regex, so these strings are converted when `jest-enforce` is called. Regular expression operators like `\w` need to be escaped: `\\w`.

## Options
`whitelist: ["<regularExpression>",...]`

If a file path matches one of the expressions in the whitelist it will be excluded from warnings.

`printList: <true/false>`

Print the full list of files getting extraneous coverage. Default is  `true`.

`testNameFormat: "<regularExpression>"`

The format in which your test files are named. This removes a portion of the test file path to match the file path it's testing. For example: `example.spec.js` -> `example.js`. As mentioned above, JSON does not support regex, so regular expression operators must be escaped. Default assumes the only difference is `.spec` or `.test`: `"(\\.spec|\\.test)(.\\w+$)"`.


### TODO:
- [ ] Determine performance bottlenecks
- [ ] Whitelist for specific files
- [ ] Add option for silent mode
