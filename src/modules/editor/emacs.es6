/*global CodeMirror */

// Copied from CodeMirror's Emacs keymap:
var killRing = [];
function addToRing(str) {
  killRing.push(str);
  if (killRing.length > 50) killRing.shift();
}
function growRingTop(str) {
  if (!killRing.length) return addToRing(str);
  killRing[killRing.length - 1] += str;
}
function getFromRing(n) { return killRing[killRing.length - (n ? Math.min(n, 1) : 1)] || ""; }
function popFromRing() { if (killRing.length > 1) killRing.pop(); return getFromRing(); }

var lastKill = null;

function posEq(a, b) { return a.line == b.line && a.ch == b.ch; }

function kill(cm, from, to, mayGrow, text) {
  if (text == null) text = cm.getRange(from, to);

  if (mayGrow && lastKill && lastKill.cm == cm && posEq(from, lastKill.pos) && cm.isClean(lastKill.gen))
    growRingTop(text);
  else
    addToRing(text);
  cm.replaceRange("", from, to, "+delete");

  if (mayGrow) lastKill = {cm: cm, pos: from, gen: cm.changeGeneration()};
  else lastKill = null;
}

function getPrefix(cm, precise) {
  var digits = cm.state.emacsPrefix;
  if (!digits) return precise ? null : 1;
  clearPrefix(cm);
  return digits == "-" ? -1 : Number(digits);
}

var prefixPreservingKeys = {"Alt-G": true, "Ctrl-X": true, "Ctrl-Q": true, "Ctrl-U": true};

function maybeClearPrefix(cm, arg) {
  if (!cm.state.emacsPrefixMap && !prefixPreservingKeys.hasOwnProperty(arg))
    clearPrefix(cm);
}

function clearPrefix(cm) {
  cm.state.emacsPrefix = null;
  cm.off("keyHandled", maybeClearPrefix);
  cm.off("inputRead", maybeDuplicateInput);
}

function maybeDuplicateInput(cm, event) {
  var dup = getPrefix(cm);
  if (dup > 1 && event.origin == "+input") {
    var one = event.text.join("\n"), txt = "";
    for (var i = 1; i < dup; ++i) txt += one;
    cm.replaceSelection(txt, "end", "+input");
  }
}

function repeated(cmd) {
  var f = typeof cmd == "string" ? function(cm) { cm.execCommand(cmd); } : cmd;
  return function(cm) {
    var prefix = getPrefix(cm);
    f(cm);
    for (var i = 1; i < prefix; ++i) f(cm);
  };
}

const killKey = repeated((cm) => {
  var start = cm.getCursor(), end = cm.clipPos(CodeMirror.Pos(start.line));
  var text = cm.getRange(start, end);
  if (!/\S/.test(text)) {
    text += "\n";
    end = CodeMirror.Pos(start.line + 1, 0);
  }
  kill(cm, start, end, true, text);
});

const yankKey = (cm) => {
  var start = cm.getCursor();
  cm.replaceRange(getFromRing(getPrefix(cm)), start, start, "paste");
  cm.setSelection(start, cm.getCursor());
};

module.exports = {
  kill: killKey,
  yank: yankKey
};
