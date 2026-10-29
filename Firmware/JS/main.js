/* GRAVY CITY PIZZA: DO NOT LATE -- main game */
(function () {
  var GC = (window.GC = window.GC || {});
  var THREE = window.THREE;

  var renderer, scene, camera, sun, clock;
  var game = null;
  var world = null;

  var SHIFT = 450;             // seconds on shift
  var MAX_CARRY = 3;
  var PIZZA_COOL_RATE = 1 / 100; // heat lost per second
  var SPAWN = { x: 0, z: -8.5 };

  var CUSTOMER_LINES = [
    '"{name}"? I ordered this from GRAVY CITY. ...I love it. Here, {tip}.',
    '"You are the 4th delivery guy today. I like a man of ACTION. Here, {tip}.',
    '"My dog is going to love this. My dog is going to love YOU. Here, {tip}.',
    '"Do not think about the fact that I ordered pizza in a snowstorm. Here, {tip}.',
    '"I am on the 4th floor. You climbed? ...Here is {tip} for your EFFORT."',
    '"You look like the pizza is still hot. That is a compliment. Here, {tip}."',
    '"My neighbor tipped me {bad}. YOU are better than my neighbor. Here, {tip}."',
    '"Please tell Gravy City I said hi. Here, {tip}. Do not tell them I said hi."',
    '"I ordered 2 pizzas and you only brought 1. ...Fine. Here, {tip}."',
    '"That is a beautiful box. The pizza inside is in a BOX. Here, {tip}."'
  ];
  var COLD_LINES = [
    '"This pizza is a crime scene. I am calling the police. ...Call someone else."',
    '"Is this pizza FOSSILIZED? It has its own ECOSYSTEM."',
    '"I have seen things in the fridge older than this pizza. Goodbye."',
    '"I am not angry. I am DISAPPOINTED. Those are different."'
  ];
  var WRONG_DOOR_LINES = [
    'Wrong door. A woman in a bathrobe stares at you. The stare has weight.',
    'Wrong door. A man asks if you are the plumber. He is very sad.',
    'Wrong door. Someone says "that is not my order" in a disappointed way.',
    'Wrong door. A dog barks. It is not your dog. It is judging your route.'
  ];
  var WOBBLE_LINES = [
    'A SLICE FELL OUT. The pavement claims it.',
    'The box wobbles. A slice slides out. It is gone. Nobody will know.',
    'You sprinted. Physics took its cut. One slice, floor-bound.'
  ];

  var RADIO_LINES = [
    'DISPATCH: Reminder that tips are not optional, they are just difficult.',
    'DISPATCH: A pigeon named Gerald has been spotted near the 88. Be advised.',
    'DISPATCH: Weather update: 40% chance of bird. 60% chance of pigeon.',
    'DISPATCH: Our top driver this month was a guy who walked. Walking pays.',
    'DISPATCH: Do not deliver to the dumpster on DOUGH BLVD. I know that sounded fun.',
    'DISPATCH: Someone asked for a pizza with no cheese. We sent cheese. We are not sorry.',
    'DISPATCH: If you see a raccoon holding a pizza, that pizza is no longer yours.',
    'DISPATCH: Corporate says the grease on the road is a FEATURE. It is not.',
    'DISPATCH: You are the only driver on shift. Congratulations. Or sorry.',
    'DISPATCH: Smile for the camera. There is no camera. Still, smile.',
    'DISPATCH: Legal says we cannot call the customers "problematic" anymore.',
    'DISPATCH: The briefcase-looking thing is a pizza box. Do not steal your own pizza.'
  ];

  function radioChatter(dt) {
    game.radioTimer -= dt;
    if (game.radioTimer <= 0) {
      game.radioTimer = 34 + Math.random() * 22;
      var line = pick(RADIO_LINES);
      if (game.coldCount > 0 && Math.random() < 0.4) line = 'DISPATCH: Report of a cold pizza? We are writing it down. We are writing a lot.';
      else if (game.robbed > 0 && Math.random() < 0.4) line = 'DISPATCH: Pigeons are winning. We are considering a ceasefire.';
      GC.ui.say(line);
    }
  }

  function randInt(a, b) { return a + ((Math.random() * (b - a + 1)) | 0); }
  function pick(arr) { return arr[(Math.random() * arr.length) | 0]; }

  function setup() {
    var canvas = document.getElementById('scene');
    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(window.innerWidth, window.innerHeight, false);
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x8ec5e8);
    scene.fog = new THREE.Fog(0x8ec5e8, 110, 330);

    camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 700);
    camera.position.set(0, 6, 28);

    var hemi = new THREE.HemisphereLight(0xbfd9ff, 0x4a4a38, 0.85);
    scene.add(hemi);
    sun = new THREE.DirectionalLight(0xfff0cf, 0.95);
    sun.position.set(30, 60, 20);
    sun.castShadow = true;
    sun.shadow.mapSize.width = 2048;
    sun.shadow.mapSize.height = 2048;
    var d = 42;
    sun.shadow.camera.left = -d * 4; sun.shadow.camera.right = d * 4;
    sun.shadow.camera.top = d * 4; sun.shadow.camera.bottom = -d * 4;
    sun.shadow.camera.near = 1; sun.shadow.camera.far = 220;
    sun.shadow.bias = -0.0009;
    scene.add(sun);
    scene.add(sun.target);

    // a moon, because Gravy City deserves one
    var moon = new THREE.Mesh(
      new THREE.SphereGeometry(6, 16, 12),
      new THREE.MeshBasicMaterial({ color: 0xfff3c4 })
    );
    moon.position.set(-120, 90, -150);
    scene.add(moon);

    window.addEventListener('resize', onResize);
    GC.renderer = renderer;
    GC.threeScene = scene;
  }

  function onResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight, false);
  }

  /* ------------------------------------------------------------------ */
  function startGame() {
    var doors = world.doors;
    var orders = doors.slice();
    for (var i = orders.length - 1; i > 0; i--) {
      var j = (Math.random() * (i + 1)) | 0;
      var tmp = orders[i]; orders[i] = orders[j]; orders[j] = tmp;
    }
    game.orders = orders.map(function (d) { return { entry: d, done: false }; });
    game.carry = [];
    if (game.dropped) {
      for (var di = 0; di < game.dropped.length; di++) scene.remove(game.dropped[di].mesh);
    }
    game.dropped = [];
    game.tips = 0;
    game.delivered = 0;
    game.coldCount = 0;
    game.wrongDoors = 0;
    game.robbed = 0;
    game.momCalls = 0;
    game.momMissed = 0;
    game.slips = 0;
    game.dogBarks = 0;
    game.ads = 0;
    game.honked = 0;
    game.policeCalled = false;
    game.policeNag = 0;
    game.timeLeft = SHIFT;
    game.phoneTimer = 0;
    game.radioTimer = 18;
    game.state = 'playing';
    game.startedAt = performance.now();

    GC.annoyances.reset();
    GC.city.reset();
    if (GC.world && GC.world.reset) GC.world.reset();
    GC.player.reset(SPAWN);
    GC.player.setCarried(0);
    GC.ui.setCarry([]);
    GC.ui.hideAd();
    GC.ui.hidePhone();
    GC.ui.hideDialog();
    GC.ui.setVignette(0);
    refreshTarget();
    GC.ui.say('DISPATCH: You are on the clock. ' + world.doors.length + ' orders. Hot pizza. Go.', true);
    requestLock();
  }

  function requestLock() {
    var c = document.getElementById('scene');
    try {
      if (c.requestPointerLock) {
        var p = c.requestPointerLock();
        if (p && p.catch) p.catch(function () { });
      }
    } catch (e) { /* pointer lock is optional */ }
  }

  function currentTargetEntry() {
    if (game.carry.length) return game.carry[0].entry;
    for (var i = 0; i < game.orders.length; i++) {
      if (!game.orders[i].done) return game.orders[i].entry;
    }
    return null;
  }

  function refreshTarget() {
    var t = currentTargetEntry();
    game.currentTarget = t;
    if (t) GC.world.setMarkerTarget(t, game.timeLeft);
    else GC.world.setMarkerTarget(world.doors[0], game.timeLeft);
  }

  function pickWrongTarget() {
    var real = currentTargetEntry();
    var opts = world.doors.filter(function (d) { return d !== real; });
    if (!opts.length) return real;
    return opts[(Math.random() * opts.length) | 0];
  }

  /* ---------------- interactions ---------------- */
  function nearestDoor() {
    var p = GC.player.state.pos;
    var best = null, bd = 3.2;
    for (var i = 0; i < world.doors.length; i++) {
      var d = world.doors[i];
      var dx = p.x - d.x, dz = p.z - d.z;
      var dist = Math.sqrt(dx * dx + dz * dz);
      if (dist < bd) { bd = dist; best = d; }
    }
    return best;
  }

  function nearRestaurant() {
    var p = GC.player.state.pos;
    var r = world.restaurant;
    var dx = p.x - r.door.x, dz = p.z - r.door.z;
    return Math.sqrt(dx * dx + dz * dz) < 4.0;
  }

  function takePizza() {
    if (game.carry.length >= MAX_CARRY) {
      GC.ui.say('You cannot carry ' + MAX_CARRY + ' pizzas. Physics. Also your spine.');
      GC.audio.play('bad');
      return;
    }
    var order = null;
    for (var i = 0; i < game.orders.length; i++) {
      var o = game.orders[i];
      if (o.done) continue;
      var already = game.carry.some(function (c) { return c.order === o; });
      if (!already) { order = o; break; }
    }
    if (!order) {
      GC.ui.say('There are no more orders. Wow. That is either good news or a database error.');
      return;
    }
    var pizza = { order: order, entry: order.entry, heat: 1, burning: false, born: game.timeLeft };
    game.carry.push(pizza);
    GC.player.setCarried(game.carry.length);
    GC.ui.setCarry(game.carry);
    GC.audio.play('coin');
    GC.ui.say('DISPATCH: Order for ' + pizza.entry.address + '. It is HOT. Move.');
    // the resident comes out to wait for their pizza
    pizza.entry.customerShown = true;
    refreshTarget();
  }

  function countWrongDoor() {
    game.wrongDoors++;
    if (game.wrongDoors === 3 && !game.policeCalled) {
      game.policeCalled = true;
      GC.city.startPolice();
      GC.ui.toast('THE POLICE HAVE BEEN CALLED');
    }
  }

  function deliver(entry) {
    var idx = -1;
    for (var i = 0; i < game.carry.length; i++) {
      if (game.carry[i].entry === entry) { idx = i; break; }
    }
    if (idx < 0) {
      countWrongDoor();
      game.tips = Math.max(0, game.tips - 1);
      GC.audio.play('trombone');
      GC.ui.say(pick(WRONG_DOOR_LINES), true);
      GC.ui.toast('WRONG DOOR  (-$1)');
      GC.player.shake(0.3);
      return;
    }
    var pizza = game.carry.splice(idx, 1)[0];
    GC.player.setCarried(game.carry.length);
    GC.ui.setCarry(game.carry);
    pizza.order.done = true;
    game.delivered++;

    var tip = 0;
    if (pizza.heat < 0.25) {
      game.coldCount++;
      tip = 0;
      GC.audio.play('trombone');
      GC.ui.toast('COLD PIZZA  ($0)');
      sayCustomer(COLD_LINES, entry, 0);
    } else {
      tip = Math.round(1 + 6 * pizza.heat);
      if (Math.random() < 0.25) tip += 2;
      game.tips += tip;
      GC.audio.play('ding');
      GC.ui.toast('+' + tip + '$  HOT PIZZA!');
      sayCustomer(CUSTOMER_LINES, entry, tip);
    }
    // the resident appears to collect their shame
    entry.customerShown = true;
    entry.customerT = 0;
    refreshTarget();
  }

  function sayCustomer(lines, entry, tip) {
    var raw = pick(lines);
    var text = raw.replace('{name}', entry.number + ' ' + entry.street).replace('{tip}', '$' + tip).replace('{bad}', '$2');
    GC.player.freeze(true);
    GC.ui.dialog('RESIDENT: ' + entry.number, [text], function () {
      GC.player.freeze(false);
    });
  }

  function wrongDoorNoPizza(entry) {
    if (game.carry.length) {
      countWrongDoor();
      game.tips = Math.max(0, game.tips - 1);
      GC.audio.play('trombone');
      GC.ui.say(pick(WRONG_DOOR_LINES), true);
      GC.ui.toast('WRONG DOOR  (-$1)');
      GC.player.shake(0.3);
    } else {
      GC.ui.say('DISPATCH: ' + entry.number + ' ' + entry.street + ' is not your order. Grab a pizza first.');
      GC.audio.play('click');
    }
  }

  function interact() {
    if (game.state !== 'playing') return;
    if (GC.annoyances.phoneRinging) {
      game.momCalls++;
      GC.annoyances.answerPhone();
      GC.player.freeze(true);
      GC.ui.dialog('MOM', [
        'Hello? Is that my son? Is that a pizza?',
        'Are you EATING it on the way? Yash, are you EATING it?',
        '...Good boy. Mom loves you. Mom will tip you.',
        'Love you, bye. I am going to tell Aunt Carol about the shirt.'
      ], function () {
        GC.player.freeze(false);
        game.tips += 2;
        GC.ui.toast('MOM TIPPED $2');
        GC.ui.say('MOM: "You are my favorite child. Do not tell your father."');
      });
      return;
    }
    // a neighbour with something to say
    var person = GC.city.nearestCharacter(GC.player.state.pos, 2.8);
    if (person) {
      GC.city.talkTo(person);
      return;
    }
    var door = nearestDoor();
    if (door) {
      var has = game.carry.some(function (c) { return c.entry === door; });
      if (has) deliver(door);
      else wrongDoorNoPizza(door);
      return;
    }
    var dropped = nearestDropped();
    if (dropped) { retrieveDropped(dropped); return; }
    if (nearRestaurant()) {
      takePizza();
      return;
    }
    GC.ui.say('Nothing to do here. Even you are wasting a pizza.');
  }

  function giveFreePizza() {
    if (game.carry.length) {
      for (var i = 0; i < game.carry.length; i++) game.carry[i].heat = 1;
      GC.ui.setCarry(game.carry);
      GC.ui.toast('PIZZA REHEATED BY MYSTERY FORCES');
      GC.ui.say('The sandwich board guy hands you a pizza that is somehow hot again. DO NOT ASK.', true);
    } else {
      game.tips += 1;
      GC.ui.toast('FREE PIZZA COUPON: $1 OFF');
    }
    GC.audio.play('coin');
  }

  /* ---------------- events from the annoyance engine ---------------- */
  function onPigeonAttack() {
    if (game.carry.length) {
      var idx = (Math.random() * game.carry.length) | 0;
      var pizza = game.carry.splice(idx, 1)[0];
      game.robbed++;
      GC.player.setCarried(game.carry.length);
      GC.ui.setCarry(game.carry);
      dropPizza(pizza);
      GC.ui.say('&#128442; A PIGEON STOLE YOUR PIZZA. It looked guilty.', true);
      GC.ui.toast('PIZZA STOLEN BY PIGEON');
      GC.audio.play('bad');
    } else {
      GC.ui.say('&#128442; A pigeon headbutted you. It was empty. It did not care.', true);
    }
    refreshTarget();
  }

  function insideBuilding(x, z, margin) {
    var m = margin || 0;
    for (var i = 0; i < world.colliders.length; i++) {
      var c = world.colliders[i];
      if (x > c.minX - m && x < c.maxX + m && z > c.minZ - m && z < c.maxZ + m) return true;
    }
    return false;
  }

  function dropPizza(pizza) {
    var m = new THREE.Group();
    var box = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.14, 0.62), new THREE.MeshLambertMaterial({ color: 0xd9a441 }));
    m.add(box);
    var lid = new THREE.Mesh(new THREE.BoxGeometry(0.64, 0.04, 0.64), new THREE.MeshLambertMaterial({ color: 0xefc15c }));
    lid.position.y = 0.09; m.add(lid);
    // never drop the pizza inside a wall -- find open ground
    var px = GC.player.state.pos.x, pz = GC.player.state.pos.z;
    var x = px, z = pz;
    for (var tries = 0; tries < 12; tries++) {
      var a = Math.random() * Math.PI * 2, r = 1.6 + Math.random() * 2.4;
      x = px + Math.cos(a) * r; z = pz + Math.sin(a) * r;
      if (!insideBuilding(x, z, 0.8)) break;
    }
    if (insideBuilding(x, z, 0.8)) { x = px; z = pz; }
    m.position.set(x, 0.1, z);
    m.rotation.y = Math.random() * 3;
    scene.add(m);
    game.dropped.push({ x: x, z: z, pizza: pizza, mesh: m });
  }

  function nearestDropped() {
    var p = GC.player.state.pos;
    var best = null, bd = 2.6;
    for (var i = 0; i < game.dropped.length; i++) {
      var d = game.dropped[i];
      var dx = p.x - d.x, dz = p.z - d.z;
      var dist = Math.sqrt(dx * dx + dz * dz);
      if (dist < bd) { bd = dist; best = d; }
    }
    return best;
  }

  function retrieveDropped(d) {
    var idx = game.dropped.indexOf(d);
    if (idx >= 0) game.dropped.splice(idx, 1);
    scene.remove(d.mesh);
    if (game.carry.length >= MAX_CARRY) {
      GC.ui.say('Your hands are full. The pizza will wait. It is very patient now.');
      return;
    }
    d.pizza.heat = Math.max(0.05, d.pizza.heat - 0.15);
    game.carry.push(d.pizza);
    GC.player.setCarried(game.carry.length);
    GC.ui.setCarry(game.carry);
    GC.audio.play('coin');
    GC.ui.toast('SALVAGED A PIZZA');
    GC.ui.say('You fished a pigeon-gnawed pizza out of the gutter. It is mostly still pizza.');
    refreshTarget();
  }

  function onDogBark() {
    game.dogBarks++;
    GC.player.freeze(true);
    GC.player.shake(0.6);
    GC.ui.toast('THE DOG BITES YOUR ANKLE');
    GC.ui.say('&#128054; The dog has claimed your ankle. It is not leaving.', true);
    setTimeout(function () { GC.player.freeze(false); }, 900);
    for (var i = 0; i < game.carry.length; i++) game.carry[i].heat = Math.max(0, game.carry[i].heat - 0.06);
    GC.ui.setCarry(game.carry);
  }

  function onWobble() {
    if (!game.carry.length) return;
    var pizza = game.carry[(Math.random() * game.carry.length) | 0];
    pizza.heat = Math.max(0.05, pizza.heat - 0.3);
    GC.ui.setCarry(game.carry);
    GC.ui.say(pick(WOBBLE_LINES), true);
    GC.ui.toast('A SLICE FELL OUT');
    GC.audio.play('squeal');
  }

  function onPhoneMissed() {
    game.momMissed++;
    game.tips = Math.max(0, game.tips - 3);
    GC.audio.play('trombone');
    GC.ui.say('MOM: "I saw it go to voicemail. We are going to have a CONVERSATION."', true);
    GC.ui.toast('MOM IS DISAPPOINTED  (-$3)');
  }

  function onAdClaimed() {
    game.ads++;
    game.tips = Math.max(0, game.tips - 1);
    GC.ui.toast('VIRUS FOUND: 1 (JUST KIDDING)');
    GC.ui.say('&#128250; Your prize: a free pizza at a place that does not exist.', true);
  }

  function burnRandomPizza() {
    if (!game.carry.length) {
      GC.ui.say('A heat wave rolls through. Nothing is on fire. Disappointing.', true);
      return;
    }
    var p = game.carry[(Math.random() * game.carry.length) | 0];
    p.burning = true;
    GC.ui.setCarry(game.carry);
  }

  /* ---------------- end of shift ---------------- */
  function endGame(reason) {
    if (game.state === 'ended') return;
    game.state = 'ended';
    GC.ui.hideAd();
    GC.ui.hidePhone();
    GC.ui.hideDialog();
    var tips = game.tips;
    var grade, quip;
    if (reason === 'time') {
      grade = 'TIME IS UP';
      quip = 'The shift is over. The pizza is not. Nobody is happy.';
    } else     if (tips >= 55) {
      grade = 'GRAVY CITY GOLD';
      quip = 'Legend. The pigeons send their regards. They are taking the day off.';
    } else if (tips >= 42) {
      grade = 'STRONGLY AVERAGE';
      quip = 'Solid. Not memorable. The pizza was definitely on time though.';
    } else if (tips >= 28) {
      grade = 'MOSTLY DELIVERED';
      quip = 'You finished most of them. "Most" is doing heavy lifting in that sentence.';
    } else if (tips >= 15) {
      grade = 'BELOW GRAVEYARD AVERAGE';
      quip = 'The manager has questions. The pigeons have answers. Neither is kind.';
    } else {
      grade = 'PHD IN FAILURE';
      quip = 'Graveside pizza is still a pizza. Technically.';
    }
    var rows = [
      ['Tips earned', '$' + tips],
      ['Pizzas delivered', game.delivered + '/' + game.orders.length],
      ['Cold pizzas', game.coldCount],
      ['Wrong doors', game.wrongDoors],
      ['Pigeons won', game.robbed],
      ['Mom called', game.momCalls + ' (missed ' + game.momMissed + ')'],
      ['Fake ads clicked', game.ads],
      ['Dog incidents', game.dogBarks],
      ['Times honked at', (game.honked || 0)],
      ['Time left', Math.max(0, Math.floor(game.timeLeft)) + 's']
    ];
    GC.ui.showResults({ title: reason === 'time' ? 'SHIFT OVER' : 'ALL ORDERS DELIVERED', grade: grade, quip: quip, rows: rows });
    GC.audio.play('trombone');
    if (document.exitPointerLock) document.exitPointerLock();
  }

  /* ---------------- main loop ---------------- */
  var last = 0;
  function loop(now) {
    requestAnimationFrame(loop);
    if (!last) last = now;
    var dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    var t = now / 1000;

    if (game.state === 'playing') {
      game.timeLeft -= dt;
      if (game.timeLeft <= 0) {
        game.timeLeft = 0;
        endGame('time');
      } else if (game.delivered >= game.orders.length) {
        GC.ui.say('DISPATCH: That is every order. Go home. ...Take the scooter.', true);
        endGame('done');
      }
      // pizzas cool down
      radioChatter(dt);
      var worst = 0;
      for (var i = 0; i < game.carry.length; i++) {
        var p = game.carry[i];
        p.heat -= PIZZA_COOL_RATE * dt * (p.burning ? 3.2 : 1);
        if (p.burning && p.heat <= 0.02) {
          p.heat = 0;
          game.carry.splice(i, 1);
          i--;
          GC.player.setCarried(game.carry.length);
          GC.ui.setCarry(game.carry);
          GC.audio.play('bad');
          GC.ui.toast('YOUR PIZZA BURNED');
          GC.ui.say('&#128293; The pizza is ruined. It is now a science experiment.', true);
          refreshTarget();
          continue;
        }
        worst = Math.max(worst, p.heat);
      }
      if (game.carry.length) {
        var hot = 0;
        for (var k = 0; k < game.carry.length; k++) hot = Math.max(hot, game.carry[k].burning ? 1 : Math.max(0, 1 - game.carry[k].heat * 1.6));
        GC.ui.setVignette(Math.min(0.9, hot * 0.55));
      } else {
        GC.ui.setVignette(0);
      }
    }

    GC.player.update(dt);
    GC.annoyances.update(dt, t);
    GC.world.update(dt, t);
    GC.world.updateMarker(dt, t);
    GC.city.update(dt, t);
    GC.ui.update(dt, t);

    if (game.state === 'playing' || game.state === 'paused' || game.state === 'ended') {
      var p0 = GC.player.state.pos;
      sun.position.set(p0.x + 30, 60, p0.z + 20);
      sun.target.position.set(p0.x, 0, p0.z);
      sun.target.updateMatrixWorld();
    }

    if (game.state === 'playing' || game.state === 'ended') {
      var tgt = currentTargetEntry();
      GC.ui.setStats({
        tips: game.tips,
        delivered: game.delivered,
        total: game.orders.length,
        time: game.timeLeft,
        targetName: tgt ? tgt.name : 'ALL DONE',
        address: tgt ? tgt.address : 'every order is complete'
      });
    }

    if (game.state === 'playing') {
      // context prompt
      var prompt = '';
      var who = GC.city.nearestCharacter(GC.player.state.pos, 2.8);
      if (GC.annoyances.phoneRinging) prompt = '<kbd>E</kbd> Answer Mom';
      else if (who) prompt = '<kbd>E</kbd> Talk to ' + who.name;
      else {
        var nd = nearestDoor();
        if (nd) {
          var has = game.carry.some(function (c) { return c.entry === nd; });
          prompt = has ? '<kbd>E</kbd> Deliver to ' + nd.number : 'That is not your order.';
        } else if (nearRestaurant()) {
          prompt = game.carry.length >= MAX_CARRY ? 'Hands full. Deliver something.' : '<kbd>E</kbd> Take pizza';
        } else if (nearestDropped()) {
          prompt = '<kbd>E</kbd> Salvage a pizza from the gutter';
        }
      }
      GC.ui.setPrompt(prompt);
    }

    renderer.render(scene, camera);
  }

  /* ---------------- boot ---------------- */
  function boot() {
    setup();
    GC.ui.init();
    world = GC.world.build(scene);
    GC.worldData = world;
    GC.city.build(scene, world);
    GC.ui.setWorld(world);
    GC.player.create(scene, camera, SPAWN, world);
    GC.annoyances.init(scene);

    game = GC.game = {
      state: 'menu',
      timeLeft: SHIFT,
      shiftLength: SHIFT,
      carry: [],
      orders: [],
      tips: 0,
      delivered: 0,
      currentTarget: null,
      phoneTimer: 0,
      onPigeonAttack: onPigeonAttack,
      onDogBark: onDogBark,
      onWobble: onWobble,
      onPhoneMissed: onPhoneMissed,
      onAdClaimed: onAdClaimed,
      burnRandomPizza: burnRandomPizza,
      giveFreePizza: giveFreePizza,
      pickWrongTarget: pickWrongTarget,
      refreshTarget: refreshTarget,
      requestLock: requestLock,
      pause: function (reason) {
        if (game.state !== 'playing') return;
        game.state = 'paused';
        game.pauseReason = reason || 'unknown';
        document.getElementById('pause').classList.remove('hidden');
        GC.player.freeze(true);
      },
      resume: function () {
        if (game.state !== 'paused') return;
        game.state = 'playing';
        document.getElementById('pause').classList.add('hidden');
        GC.player.freeze(false);
        requestLock();
      },
      restart: function () {
        document.getElementById('results').classList.add('hidden');
        document.getElementById('pause').classList.add('hidden');
        startGame();
      }
    };

    window.addEventListener('keydown', function (e) {
      if (e.code === 'KeyE') interact();
      if (e.code === 'Escape' && game.state === 'playing') game.pause('escape-key');
    });
    window.addEventListener('blur', function () { if (game.state === 'playing') game.pause('window-blur'); });

    document.getElementById('play-btn').addEventListener('click', function () {
      GC.audio.init(); GC.audio.resume();
      document.getElementById('menu').classList.add('hidden');
      document.getElementById('hud').classList.remove('hidden');
      startGame();
    });
    document.getElementById('resume-btn').addEventListener('click', function () { game.resume(); });
    document.getElementById('again-btn').addEventListener('click', function () { game.restart(); });

    // if the browser refused the mouse (or the fake ad stole it), click to grab it back
    document.getElementById('scene').addEventListener('mousedown', function () {
      if (game.state === 'playing' && !document.pointerLockElement && !(GC.ui && GC.ui.isModalOpen())) requestLock();
    });

    document.getElementById('loading').classList.add('hidden');
    requestAnimationFrame(loop);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
