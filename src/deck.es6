/*global setTimeout */

var events = require("./lib/events");
var mousetrap = require("./lib/mousetrap");

function toArray(indexable) {
  const out = [], l = indexable.length;
  for (let i = 0; i < l; i++) {
    out.push(indexable[i]);
  }
  return out;
}

function Deck(container, deckModules) {

  const slides = toArray(container.querySelectorAll("section"));
  this.currentSlide = null;

  slides.forEach((slide) => {
    const children = toArray(slide.childNodes);
    const container = document.createElement("div");
    container.classList.add("slideContainer");
    children.forEach((child) => {
      slide.removeChild(child);
      container.appendChild(child);
    });
    slide.appendChild(container);
  });

  function slideIndex(slide) {
    return slides.indexOf(slide);
  }

  this.deactivateSlide = (slide) => {
    if (slide.classList.contains("current")) {
      slide.classList.add("out");
      slide.classList.remove("current");
    }
    this.currentSlide = null;
  }

  this.activateSlide = (slide) => {
    if (slide.classList.contains("out")) {
      this.cleanupModules(slide);
      slide.classList.remove("out");
    }
    if (this.currentSlide !== null) this.deactivateSlide(slides[this.currentSlide]);
    this.currentSlide = slideIndex(slide);

    this.activateModules(slide);

    slide.classList.add("current");
    slide.classList.add("in");
    window.location.hash = "" + this.currentSlide;
  }

  this.nextSlide = () => {
    let nextSlide = this.currentSlide !== null ? this.currentSlide + 1 : 0;
    if (nextSlide >= slides.length) nextSlide = slides.length - 1;
    if (nextSlide !== this.currentSlide) this.activateSlide(slides[nextSlide]);
  }

  this.previousSlide = () => {
    let prevSlide = this.currentSlide !== null ? this.currentSlide - 1 : 0;
    if (prevSlide < 0) prevSlide = 0;
    if (prevSlide !== this.currentSlide) this.activateSlide(slides[prevSlide]);
  }

  this.initModules = (slide) => {
    let slideData = slide.dataset,
        deckData = container.dataset;
    let mods = [], mod;
    for (mod in deckModules) {
      if (deckModules.hasOwnProperty(mod)) {
        let arg = slideData.hasOwnProperty(mod) ? slideData[mod] :
              deckData.hasOwnProperty(mod) ? deckData[mod] : null;
        if (arg) mods.push(new deckModules[mod](slide, arg));
      }
    }
    slide._deck_modules = mods;
  }

  this.activateModules = (slide) => {
    slide._deck_modules.forEach((mod) => mod.activate && mod.activate());
  }

  this.stabiliseModules = (slide) => {
    slide._deck_modules.forEach((mod) => mod.stabilise && mod.stabilise());
  }

  this.cleanupModules = (slide) => {
    slide._deck_modules.forEach((mod) => mod.cleanup && mod.cleanup());
  }

  this.transitionEnd = (e) => {
    let slide = e.target;
    if (slide.classList.contains("out")) {
      slide.classList.remove("out");
      this.cleanupModules(slide);
    } else if (slide.classList.contains("in")) {
      slide.classList.remove("in");
      this.stabiliseModules(slide);
    }
  }

  slides.forEach(((slide) => this.initModules(slide)).bind(this));

  events.on(container, events.vendorPrefix("TransitionEnd"), this.transitionEnd, this);

  this.bind = (binding, callback) => {
    mousetrap.bind(binding, callback.bind(this));
  };

  this.bind(["pageup", "left"], this.previousSlide);
  this.bind(["pagedown", "space", "right"], this.nextSlide);

  setTimeout(() => {
    let match = /^#(\d+)$/.exec(window.location.hash);
    if (match) {
      this.activateSlide(slides[parseInt(match[1], 10)]);
    } else {
      this.nextSlide();
    }
  }, 1);

}

module.exports = Deck;
