function minIndent(text) {
  return text.split("\n").reduce(function(min, line) {
    if (line.trim().length === 0) return min;
    var indent = line.length - line.trimLeft().length;
    return min === null ? indent : Math.min(min, indent);
  }, null);
}

function alignIndents(text) {
  var indent = minIndent(text);
  return text.split("\n").map(function(line) {
    return line.slice(indent).trimRight();
  }).join("\n");
}

function cleanText(text, type) {
  text = alignIndents(text);
  while (text[0] === "\n") text = text.slice(1);
  while (text[text.length-1] === "\n") text = text.slice(0, text.length - 1);
  if (type === "html") {
    text = text.replace(/&gt;/g, ">").replace(/&lt;/g, "<").replace(/&amp;/g, "&");
  }
  return text + "\n";
}

module.exports = { cleanText: cleanText };
