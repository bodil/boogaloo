/*global setTimeout */

(function() {
  function evalCode(code) {
    setTimeout(function() {
      eval(code);
    }, 1);
  }

  function onMessage(e) {
    var message;
    try {
      message = JSON.parse(e.data);
    } catch(e) {
      return;
    }

    if (message.hasOwnProperty("key") && window.Mousetrap) {
      Mousetrap.trigger(message.key);
    }

    if (message.hasOwnProperty("code")) {
      evalCode(message.code);
    }
  }

  window.addEventListener("message", onMessage);
  window.postMessage("rdy lol", "*");
})();
