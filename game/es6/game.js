/*global React, Rx, Audio */

function deepCopy(target, obj) {
  for (let prop in obj)
    if (obj.hasOwnProperty(prop))
      if (typeof obj[prop] === "object")
	target[prop] = deepCopy({}, obj[prop]);
  else target[prop] = obj[prop];
}

function assoc(...args) {
  let out = {};
  for (let i = 0; i < args.length; i++)
    deepCopy(out, args[i]);
  return out;
}

function bounds(me) {
  return {
    x1: me.x + (me.baseX || 0),
    y1: me.y + (me.baseY || 0),
    x2: me.x + (me.baseX || 0) + 100,
    y2: me.y + (me.baseY || 0) + 100
  };
}

function intersects(me, target) {
  let b1 = bounds(me), b2 = bounds(target);
  return !(b2.x1 > b1.x2 || b2.x2 < b1.x1 ||
	   b2.y1 > b1.y2 || b2.y2 < b1.y1);
}

const canvas = document.getElementById("canvas");

function onscreen(node) {
  return !(node.x < -300 || node.y < -1000 || node.y > 1000);
}

function makeElement(node) {
  return React.DOM.div({
    className: node.id,
    style: {
      left: Math.floor(node.x + (node.baseX || 0)) + "px",
      top: Math.floor(node.y + (node.baseY || 0)) + "px"
    }
  });
}

function renderScene(nodes) {
  return React.renderComponent(
    React.DOM.div(null, nodes.map(makeElement)),
    canvas
  );
}

function bindKey(key) {
  let sub = new Rx.Subject();
  Mousetrap.bind(key, () => {
    sub.onNext(key);
  });
  return sub;
}

let groundStream = Rx.Observable.interval(33)
      .map((x) => ({
	id: "ground",
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
  id: "hater",
  vx: -8, vy: 0,
  x: 1600, y: 300
};

let haterStream = tick.scan(initialHater, (c, keys) => {
  // Apply velocity to position.
  c = velocity(c);
  return onscreen(c) ? c : initialHater;
});

let pinkieStream = Rx.Observable.zipArray(tick, haterStream).scan({
  id: "pinkie",
  baseY: 276,
  x: 0, y: 0,
  vx: 0, vy: 0,
  gameOver: false
}, (p, [keys, hater]) => {
  p = velocity(p);

  if (intersects(p, hater)) {
    p.gameOver = true;
    p.id = "pinkie gameover";
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

  p.id = (p.y < 0) ? "pinkie jumping" : "pinkie";

  return p;
}).takeWhile(onscreen);

let initialCoin = {
  id: "coin",
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
