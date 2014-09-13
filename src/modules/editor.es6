/*global setTimeout, Audio */

require("codemirror/lib/codemirror.js");
require("codemirror/lib/codemirror.css");

require("codemirror/addon/edit/matchbrackets.js");
require("codemirror/addon/edit/closebrackets.js");
require("codemirror/addon/hint/show-hint.js");
require("codemirror/addon/hint/show-hint.css");
require("codemirror/addon/hint/anyword-hint.js");
require("codemirror/addon/selection/active-line.js");
require("codemirror/addon/comment/comment.js");
require("codemirror/addon/tern/tern.js");
require("codemirror/addon/tern/tern.css");

require("codemirror/mode/javascript/javascript.js");

require("codemirror/theme/xq-light.css");

let CodeMirror = window.CodeMirror; // :(
window.tern = require("tern"); // ;(((

var events = require("../lib/events");
var text = require("../lib/text");
var emacs = require("./editor/emacs");
var es6ify = require("./editor/es6ify");
var esprima = require("./editor/esprima");
var Spinner = require("spin.js");
var _ = require("underscore");

function Editor(slide, mode) {
  const args = slide.dataset;
  const target = slide.querySelector(".slideContainer");
  const initialCode = target.innerHTML;

  this.onTabClose = () => {
    if (!this.cm.isClean()) {
      return "The current buffer has modifications.";
    }
  };

  // --- Comms

  this.send = (message) => {
    this.targetFrame.contentWindow.postMessage(JSON.stringify(message), "*");
  };

  this.compile = () => {
    var js = es6ify.compile(this.cm.getDoc().getValue());
    this.cm.clearGutter();
    if (js.errors.length) {
      new Audio(require("./editor/smb_bump.mp3")).play();
      for (let i = 0; i < js.errors.length; i++) {
        let [all, file, line, ch, msg] = /^([^:]*):(\d+):(\d+): (.*)$/.exec(js.errors[i]);
        line = parseInt(line, 10) -1; ch = parseInt(ch, 10) -1;
        let marker = document.createElement("img");
        marker.title = msg;
        marker.classList.add("cm-error");
        this.cm.setGutterMarker(line, "cm-errors", marker);
      }
      return null;
    } else {
      return js.js;
    }
  };

  this.evalInFrame = (cm) => {
    // FIXME select behaviour by language, don't assume JS
    const js = this.compile();
    if (!js) return;

    if (args.reload !== undefined) {
      this.targetFrame.src = args.href;
      setTimeout((() => {
        events.until(this.targetFrame.contentWindow, "message", function(e) {
          if (e.data === "rdy lol") {
            this.send({code: js});
            return true;
          }
        }, this);
      }).bind(this), 100);
    } else {
      this.send({code: js});
    }
  };

  this.evalFormAtPoint = (cm) => {
    // FIXME select behaviour by language, don't assume JS
    const src = cm.getDoc().getValue();
    const tree = esprima.parse(src, {
      tolerant: true, range: true
    });
    const cur = cm.indexFromPos(cm.getCursor());
    tree.body
      .filter((n) => cur >= n.range[0] && cur <= n.range[1])
      .forEach((n) => {
        cm.getDoc().setSelection(cm.posFromIndex(n.range[0]),
                                 cm.posFromIndex(n.range[1]));
        var js = es6ify.compile(cm.getDoc().getSelection());
        if (js.errors.length) {
          new Audio(require("./editor/smb_bump.mp3")).play();
          let marker = document.createElement("img");
          marker.title = js.errors[0];
          marker.classList.add("cm-error");
          this.cm.setGutterMarker(cm.posFromIndex(n.range[1]).line, "cm-errors", marker);
        } else {
          console.log(js.js);
          this.send({code: js.js});
        }
      });
  };

  this.reloadFrame = (cm) => {
    this.targetFrame.src = args.href;
  };

  // --- keybindings

  this.iframeBind = (key) => {
    return (function() { this.send({ key: key }); }).bind(this);
  };

  const keymap = {};
  keymap["Ctrl-S"] = this.evalInFrame.bind(this);
  keymap["Ctrl-D"] = this.evalFormAtPoint.bind(this);
  keymap["Ctrl-R"] = this.reloadFrame.bind(this);
  keymap["Alt-Space"] = this.iframeBind("space");
  keymap["Alt-Enter"] = this.iframeBind("enter");
  keymap["Alt-Up"] = this.iframeBind("up");
  keymap["Alt-Down"] = this.iframeBind("down");
  keymap["Alt-Left"] = this.iframeBind("left");
  keymap["Alt-Right"] = this.iframeBind("right");
  keymap["Ctrl-K"] = emacs.kill;
  keymap["Ctrl-Y"] = emacs.yank;
  keymap["Ctrl-A"] = "goLineStartSmart";
  keymap["Ctrl-E"] = "goLineEnd";
  keymap["Ctrl-,"] = "toggleComment";
  keymap.Tab = (cm) => cm.indentLine(cm.getDoc().getCursor().line);
  keymap["Ctrl-\\"] = (cm) => CodeMirror.showHint(cm);
  keymap["Ctrl-="] = (cm) => CodeMirror.showHint(cm);
  keymap["Ctrl-'"] = (cm) => {
    const cur = cm.getDoc().getCursor();
    const token = cm.getTokenAt(cur, true);
    cm.getDoc().extendSelection({line: cur.line, ch: token.start},
                                {line: cur.line, ch: token.end});
  }
  keymap.Esc = (cm) => {
    // wow, much hack
    const input = document.createElement("input");
    input.setAttribute("type", "text");
    document.body.appendChild(input);
    input.focus();
    input.parentNode.removeChild(input);
  };

  // --- CodeMirror config

  const options = {
    value: text.cleanText(initialCode, "html"),
    mode: mode,
    extraKeys: keymap,
    gutters: ["cm-errors"],
    // lineNumbers: true,
    lineWrapping: false,
    // matchBrackets: true,
    autoCloseBrackets: true,
    styleActiveLine: true,
    theme: "xq-light"
  };

  // --- activate

  this.activate = () => {
    slide.classList.add("editor");
    target.innerHTML = "";

    this.editorFrame = document.createElement("div");
    this.editorFrame.classList.add("editorFrame");
    target.appendChild(this.editorFrame);

    this.targetContainer = document.createElement("div");
    this.targetContainer.classList.add("targetFrame");

    this.targetFrame = document.createElement("iframe");

    this.loaderFrame = document.createElement("div");
    this.loaderFrame.classList.add("loaderFrame");
    this.targetContainer.appendChild(this.loaderFrame);
    target.appendChild(this.targetContainer);

    const factor = Math.min(this.loaderFrame.clientWidth,
                            this.loaderFrame.clientHeight) / 13.25;
    this.spinner = new Spinner({
      color: "white",
      shadow: true,
      hwaccel: true,
      length: factor * 2,
      radius: factor * 2,
      width: factor,
      trail: 40,
      lines: 12
    }).spin(this.loaderFrame);

    this.cm = CodeMirror(this.editorFrame, options);
    this.cm.setSize("100%", "100%");

    if (mode === "text/javascript") {
      let tern = new CodeMirror.TernServer({
        defs: [ require("tern/defs/ecma5.json"),
                require("tern/defs/browser.json"),
                require("./editor/mousetrap.json"),
                require("./editor/rxjs.json") ]
      });
      let ternKeymap = _.extend({}, keymap);
      ternKeymap["Ctrl-\\"] = (cm) => tern.complete(cm);
      ternKeymap["Ctrl-I"] = (cm) => tern.showType(cm);
      ternKeymap["Alt-."] = (cm) => tern.jumpToDef(cm);
      ternKeymap["Alt-,"] = (cm) => tern.jumpBack(cm);
      ternKeymap["Ctrl-Q"] = (cm) => tern.rename(cm);
      this.cm.setOption("extraKeys", ternKeymap);
      this.cm.on("cursorActivity", (cm) => tern.updateArgHints(cm));
    }
  }

  // --- stabilise

  this.stabilise = () => {
    this.targetFrame.style.display = "none";
    this.targetFrame.src = args.href;
    this.targetContainer.appendChild(this.targetFrame);
    events.until(this.targetFrame.contentWindow, "message", function(e) {
      if (e.data === "rdy lol") {
        this.spinner.stop();
        this.targetFrame.style.display = "";
        this.targetContainer.removeChild(this.loaderFrame);
        this.loaderFrame = this.spinner = null;
        return true;
      }
    }, this);
    this.cm.refresh();
    this.cleanupHandler = events.on(window, "beforeunload", this.onTabClose, this);
  }

  // --- cleanup

  this.cleanup = () => {
    if (this.cleanupHandler) {
      events.off(this.cleanupHandler);
      this.cleanupHandler = null;
    }
    this.cm = null;
    target.innerHTML = initialCode;
    target.classList.remove("editor");
  }

}

module.exports = Editor;
