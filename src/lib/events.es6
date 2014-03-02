// Thanks http://lea.verou.me/2009/02/find-the-vendor-prefix-of-the-current-browser/
var cachedPrefix = null;

function getPrefix() {
  if (cachedPrefix) return cachedPrefix;
  const regex = /^(Moz|Webkit|Khtml|O|ms|Icab)(?=[A-Z])/;
  const elem = document.body;
  for (let prop in elem.style) {
    if (regex.test(prop)) {
      return cachedPrefix = prop.match(regex)[0];
    }
  }
  if ("WebkitOpacity" in elem.style) {
    return cachedPrefix = "Webkit";
  }
  if ("KhtmlOpacity" in elem.style) {
    return cachedPrefix = "Khtml";
  }
  return cachedPrefix = "";
}

var cachedEvents = {};

function vendorPrefix(prop) {
  if (cachedEvents.hasOwnProperty(prop)) return cachedEvents[prop];
  const vp = getPrefix().toLowerCase();
  const pp = (vp) ? (vp + prop) : prop.toLowerCase();
  cachedEvents[prop] = pp;
  return pp;
}

// Register to receive events.
function on(emitter, eventName, handler, context) {
  handler = context ? handler.bind(context) : handler;
  emitter.addEventListener(eventName, handler);
  return handler;
}

// Register to receive one single event.
function once(emitter, eventName, handler, context) {
  handler = context ? handler.bind(context) : handler;
  let wrapper = function onceHandler(event) {
    emitter.removeEventListener(eventName, onceHandler);
    handler(event);
  };
  emitter.addEventListener(eventName, wrapper);
  return wrapper;
}

// Register to receive events until the handler function returns true.
function until(emitter, eventName, handler, context) {
  handler = context ? handler.bind(context) : handler;
  let wrapper = function untilHandler(event) {
    if (handler(event))
      emitter.removeEventListener(eventName, untilHandler);
  };
  emitter.addEventListener(eventName, wrapper);
  return wrapper;
}

// Unregister an event handler.
function off(emitter, eventName, handler) {
  emitter.removeEventListener(eventName, handler);
}

module.exports = {
  on: on, once: once, until: until, off: off, vendorPrefix: vendorPrefix
};
