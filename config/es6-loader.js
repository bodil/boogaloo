/*global Buffer */

var traceur = require("traceur");

function throwErrors(errs) {
  return "throw new Error(\'ES6 compilation failed.\\n" +
    errs.map(function(l) {
      return l.replace(/'/g, "\\\'").replace(/"/g, "\\\"");
    }).join("\\n") + "\');\n";
}

module.exports = function(source) {
  var callback = this.async();
  this.cacheable();
  var out = traceur.compile(source, {
    filename: this.resourcePath,
    modules: "commonjs",
    sourceMap: true,
    blockBinding: true,
    symbols: true,
    deferredFunctions: true,
    types: true,
    annotations: true
  });
  out.errors.forEach(function(err) {
    this.emitError(err);
  }, this);
  this.callback(null, out.js || throwErrors(out.errors), out.sourceMap);
};
