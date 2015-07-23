// --- Actual game:

function makeElement(node) {
  return React.DOM.div({
    className: node.id,
    style: {
      left: (node.x + (node.baseX || 0)) | 0 + "px",
      top: (node.y + (node.baseY || 0)) | 0 + "px"
    }
  });
}

function renderScene(nodes) {
  return React.render(
    <div>{nodes.map(makeElement)}</div>,
    // React.DOM.div(null, nodes.map(makeElement)),
    canvas
  );
}

const groundStream = Rx.Observable.interval(33)
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

const tick = bindKey("space")
      .buffer(Rx.Observable.interval(33));

const initialHater = {
  id: "hater",
  vx: -8, vy: 0,
  x: 1600, y: 300
};

const haterStream = tick.scan(initialHater, (c, keys) => {
  // Apply velocity to position.
  c = velocity(c);
  return Object.freeze(onscreen(c) ? c : initialHater);
});

const pinkieStream = Rx.Observable.zipArray(tick, haterStream).scan({
  id: "pinkie",
  baseY: 276,
  x: 0, y: 0,
  vx: 0, vy: 0,
  gameOver: false
}, (p, [keys, hater]) => {
  p = velocity(p);

  if (intersects(p, hater) && !p.gameOver) {
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

  return Object.freeze(p);
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

  return Object.freeze(onscreen(c) ? c : initialCoin);
});

Rx.Observable.zipArray(pinkieStream, groundStream, coinStream, haterStream)
  .subscribe(renderScene);
