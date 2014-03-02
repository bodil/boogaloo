/*global traceur */

var _ = require("underscore");

var traceurCode = require("raw!traceur/bin/traceur.js");
('global', eval)(traceurCode); // I don't even

const traceurOptions = {
  modules: "commonjs",
  filename: "repl.js",
  blockBinding: true,
  symbols: true,
  deferredFunctions: true,
  types: true,
  annotations: true
};

function compile(code) {
  traceur.options.reset();
  _.extend(traceur.options, traceurOptions);

  var errorReporter = new traceur.util.TestErrorReporter();
  var sourceFile = new traceur.syntax.SourceFile(traceurOptions.filename, code);
  var parser = new traceur.syntax.Parser(sourceFile, errorReporter);
  var tree = parser.parseModule();
  var transformer = new traceur.codegeneration.FromOptionsTransformer(errorReporter);
  var transformedTree = transformer.transform(tree);

  if (errorReporter.hadError()) {
    return {
      js: null,
      errors: errorReporter.errors
    };
  } else {
    return {
      js: traceur.outputgeneration.TreeWriter.write(transformedTree),
      errors: errorReporter.errors
    };
  }
}

module.exports = { compile: compile };
