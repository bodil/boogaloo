// Filter & map array
ponies
.filter((pony) => /e$/.test(pony))
.map((pony) => "I love " + pony)
.log();

// Interval ticks
Rx.Observable.interval(500).log();

// Yield array in 500ms ticks
Rx.Observable.zip(
  Rx.Observable.interval(500),
  ponies,
  (tick, i) => i
).log();


// --- Actual game:

const canvas = $("#canvas");

$("&lt;div id='ground'>&lt;/div>").appendTo(canvas);
$("&lt;div id='pinkie'>&lt;/div>").appendTo(canvas);
$("&lt;div id='coin'>&lt;/div>").appendTo(canvas);
$("&lt;div id='hater'>&lt;/div>").appendTo(canvas);

function extend(target, src) {
  for (let prop in src) target[prop] = src[prop];
}

function assoc() {
  let out = {};
  for (let i = 0; i < arguments.length; i++) {
    extend(out, arguments[i]);
  }
  return out;
}

function onscreen(node) {
  return !(node.x < -300 || node.y < -1000 || node.y > 1000);
}

function bindKey(key) {
  let sub = new Rx.Subject();
  Mousetrap.bind(key, () => {
    sub.onNext(key);
  });
  return sub;
}

function updateElement(node) {
  $(node.id)
    .attr("class", node.classes || "")
    .css({
      left: (node.x + (node.baseX || 0)) | 0 + "px",
      top: (node.y + (node.baseY || 0)) | 0 + "px"
    });
}

function renderScene(nodes) {
  nodes.forEach(updateElement);
}

let groundStream = Rx.Observable.interval(33)
  .map((x) => ({
    id: "#ground",
    baseX: -128,
    x: ((x % 64) * -8), y: 384
  }));

function velocity(node) {
  return assoc(node, {
    x: node.x + node.vx,
    y: node.y + node.vy
  });
}

let tick = bindKey("space")
      .buffer(Rx.Observable.interval(33));

let initialHater = {
  id: "#hater",
  vx: -8, vy: 0,
  x: 1600, y: 300
};

let haterStream = tick.scan(initialHater, (c, keys) => {
  // Apply velocity to position.
  c = velocity(c);
  return onscreen(c) ? c : initialHater;
});

let pinkieStream = Rx.Observable.zipArray(tick, haterStream).scan({
  id: "#pinkie",
  baseY: 276,
  x: 0, y: 0,
  vx: 0, vy: 0,
  gameOver: false
}, (p, [keys, hater]) => {
  p = velocity(p);

  if (intersects(p, hater) && !p.gameOver) {
    p.gameOver = true;
    p.classes = "gameover";
    new Audio("sfx/gameover.mp3").play();
    p.vy = -15;
  }
  if (p.gameOver) {
    p.vy += 0.5;
    return p;
  }

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

  p.classes = (p.y < 0) ? "jumping" : "";

  return p;
}).takeWhile(onscreen);

let initialCoin = {
  id: "#coin",
  vx: -6, vy: 0,
  x: 1600, y: 40
};

let coinStream = pinkieStream.scan(initialCoin, (c, pinkie) => {
  // Apply velocity to position.
  c = velocity(c);

  // If Pinkie touches the coin, ding it!
  if (c.vy === 0 && intersects(c, pinkie)) {
    new Audio("sfx/coin.mp3").play();
    c.vx = 0; c.vy = -1;
  }
  if (c.vy < 0) {
    c.vy = c.vy * 2;
  }

  return onscreen(c) ? c : initialCoin;
});

Rx.Observable.zipArray(pinkieStream, groundStream, coinStream, haterStream)
  .subscribe(renderScene);
