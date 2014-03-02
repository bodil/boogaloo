window.global = window;
require("traceur/bin/traceur-runtime");
require("./css/screen.less");
var Deck = require("./deck");
window.deck = new Deck(document.getElementById("slides"), {
  "editor": require("./modules/editor"),
  "background": require("./modules/background"),
  "image": require("./modules/image")
});
