/*global setTimeout */

var events = require("../lib/events");

function Background(slide, url) {

  const preload = document.createElement("img");
  preload.src = url;

  // --- activate

  this.activate = () => {
    if (this.background) this.background.parentNode.removeChild(this.background);
    this.background = document.createElement("div");
    this.background.classList.add("background");
    this.background.style.backgroundImage = "url(" + url + ")";
    slide.parentNode.appendChild(this.background);
    setTimeout((() => {
      this.background.classList.add("active");
    }).bind(this), 1);
  }

  // --- cleanup

  this.cleanup = () => {
    events.once(this.background, events.vendorPrefix("TransitionEnd"), () => {
      this.background.parentNode.removeChild(this.background);
      this.background = null;
    }, this);
    this.background.classList.remove("active");
  }

}

module.exports = Background;
