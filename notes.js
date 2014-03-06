// Rx examples:

Rx.Observable.return("hai lol").log();

// Fill in array
Rx.Observable.fromArray([
  "Fluttershy",
  "Twilight Sparkle",
  "Applejack",
  "Rarity",
  "Rainbow Dash",
  "Pinkie Pie"
]).log();

.take(3).log();

.takeLast(1).log();

.take(3).takeLast(1).log();

// Interval ticks
Rx.Observable.interval(500).log();

// Yield array in 500ms ticks
Rx.Observable.zip(
  Rx.Observable.interval(500),
  ponies,
  (tick, i) => i
).log();

// Filter & map array
ponies
.filter((pony) => /e$/.test(pony))
.map((pony) => "I love " + pony)
.log();

// Combine tick & map
//<== source on slide

// Subject
this.s = new Rx.Subject();
this.s.log();
this.s.onNext("dhh");
this.s.onNext("sees");
this.s.onNext("all");
this.s.onCompleted();

// Scan
Rx.Observable.interval(500)
  .scan(0, (acc, next) => acc * next).log();


// --- Actual game:

var canvas = document.getElementById("canvas");
var pinkie = document.getElementById("pinkie");
var ground = canvas.querySelector(".ground");

function bindKey(key) {
  var sub = new Rx.Subject();
  Mousetrap.bind(key, () => {
    sub.onNext(key);
  });
  return sub;
}

function velocity(oldP) {
  var p = Object.create(oldP);
  p.x += p.vx; p.y += p.vy;
  return p;
}

function pinkiePhysics(oldP, keys) {
  // Apply Pinkie's velocity to her position.
  var p = velocity(oldP);

  // Apply gravity to Pinkie's velocity.
  p.vy += 0.98;

  // AS Pinkie Pie,
  // GIVEN that I'm falling
  // WHEN I hit the ground
  // THEN I stop.
  if (p.y >= 0 && p.vy > 0) {
    p.y = 0; p.vy = 0;
  }

  // If Pinkie is on the ground and space has been pressed, JUMP.
  if (keys[0] === "space") {
    // p.vy = -20; // wheeee infinite jump
    if (p.y === 0) {
      p.vy = -20;
      new Audio("sfx/jump.mp3").play();
    }
  }

  return p;
}

function renderPinkie(p) {
  // Apply Pinkie's position to her DOM element.
  pinkie.style.left = Math.floor(p.x) + "px";
  pinkie.style.top = Math.floor(p.y + 276) + "px";

  // If Pinkie is airborne, render her as jumping.
  // If game over, it's game over.
  pinkie.className = p.gameOver ? "gameover" : (p.y < 0) ? "jumping" : "";
}

function onscreen(n) {
  return !(n.x < -300 || n.y < -1000 || n.y > 1000);
}

function renderNode(n) {
  n.node.style.left = Math.floor(n.x) + "px";
  n.node.style.top = Math.floor(n.y) + "px";
}

function coinPhysics(oldC) {
  // Apply velocity to position.
  var c = velocity(oldC);

  // If Pinkie touches the coin, ding it!
  if (c.vy === 0 && intersects(c.node, "#pinkie").length) {
    new Audio("sfx/coin.mp3").play();
    c.vx = 0; c.vy = -1;
  }
  if (c.vy < 0) {
    c.vy = c.vy * 2;
  }

  return c;
}

function gameOverPhysics(oldC) {
  var c = velocity(oldC);
  c.vy += 0.5;
  return c;
}

function nodeStream(name, physics, y, time, speed) {
  return Rx.Observable.interval(time)
    .flatMap(() => {
      var node = document.createElement("div");
      node.className = name;
      canvas.appendChild(node);

      return Rx.Observable.interval(33)
        .scan({ x: 768, y: y, vx: speed, vy: 0, node: node}, physics)
        .takeWhile((n) => onscreen(n) && !canvas.querySelector("#pinkie.gameover"))
        .do(function() {}, function() {}, function() {
          canvas.removeChild(node);
        });
    })
}

function gameOver() {
  new Audio("sfx/gameover.mp3").play();
  return Rx.Observable.interval(33)
    .scan({ x: pinkie.offsetLeft, y: pinkie.offsetTop - 276, vx: 0, vy: -15,
            gameOver: true},
          gameOverPhysics);
}

// Rx.Observable.interval(33)
bindKey("space")
  // .do(() => new Audio("sfx/jump.mp3").play())
  .buffer(Rx.Observable.interval(33))
  .scan({ x: 64, y: 0, vx: 0, vy: 0}, pinkiePhysics)
  .takeWhile(() => intersects(pinkie, ".hater").length === 0)
  .concat(Rx.Observable.defer(gameOver))
  .takeWhile(onscreen)
  .subscribe(renderPinkie);

Rx.Observable.interval(33)
  .map((x) => ((x % 64) * -8) - 128)
  .subscribe((x) => ground.style.left = x + "px");


nodeStream("coin", coinPhysics, 96 * Math.random(), 5000, -6)
  .subscribe(renderNode);
nodeStream("hater", velocity, 300, 4000, -8)
  .subscribe(renderNode);
