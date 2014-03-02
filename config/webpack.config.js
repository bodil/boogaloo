var OccurenceOrderPlugin = require("webpack/lib/optimize/OccurenceOrderPlugin");
var DedupePlugin = require("webpack/lib/optimize/DedupePlugin");
var UglifyPlugin = require("webpack/lib/optimize/UglifyJsPlugin");

var srcPath = require("path").join(__dirname, "..", "src");
var buildPath = require("path").join(__dirname, "..", "build");

module.exports = {
  bail: true,
  cache: true,
  context: srcPath,
  entry: "./main.es6",
  output: {
    path: buildPath,
    filename: "slide.js",
    publicPath: "build/"
  },
  module: {
    loaders: [
      { test: /\.less$/, loader: "style!css!less" },
      { test: /\.css$/, loader: "style!css" },
      { test: /\.json$/, loader: "json" },
      { test: /\.png$/, loader: "url?limit=10000&mimetype=image/png" },
      { test: /\.svg$/, loader: "url?limit=10000&mimetype=image/svg" },
      { test: /\.otf$/, loader: "url?limit=10000&mimetype=application/x-font-otf" },
      { test: /\.ttf$/, loader: "url?limit=10000&mimetype=application/x-font-ttf" },
      { test: /\.mp3$/, loader: "url?limit=10000&mimetype=audio/mpeg" },
      { test: /\.html$/, loader: "url?limit=10000&mimetype=text/html" },
      { test: /\.es6$/, loader: require("path").join(__dirname, "es6-loader.js") }
    ]
  },
  devtool: "source-map",
  resolve: {
    extensions: ["", ".es6", ".js"]
    // Webpack seems to have trouble resolving some Rx modules; workaround:
    // fallback: require("path").join(__dirname, "..", "node_modules/rx")
  },
  node: {
    "global": true,
    "process": true,
    "__filename": true,
    "__dirname": true
  },
  plugins: [
    new OccurenceOrderPlugin(),
    new DedupePlugin(),
    new UglifyPlugin()
  ]
};
