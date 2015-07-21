var Pink = require("pink");

require("pink/node_modules/highlight.js/styles/vs.css");
require("./css/screen.less");

new Pink("#slides", {
  "background": require("pink/modules/background"),
  "image": require("pink/modules/image"),
  "editor": require("pink/modules/editor")([
    require("pink/modules/editor/language/javascript")
  ])
});
