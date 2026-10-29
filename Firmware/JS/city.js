(function () {
  var GC = (window.GC = window.GC || {});
  var THREE = window.THREE;

  var ROADS = [];
  for (var rv = -176; rv <= 176; rv += 32) ROADS.push(rv);
  var HALF = 200;
  var LANE = 8.6; 
  var ASPHALT = 7;

  var scene = null;
  var world = null;
  var peds = null;
  var pedData = [];
  var cars = [];
  var characters = [];
  var police = null;
  var honkCount = 0;
  var pedCount = 60;

  function mat(color, extra) {
    var m = new THREE.MeshLambertMaterial({ color: color });
    if (extra) for (var k in extra) m[k] = extra[k];
    return m;
  }

  function rng(seed) {
    var s = seed >>> 0;
    return function () {
      s += 0x6D2B79F5;
      var t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function buildPeds(count) {
    var skins = [0xe0ac69, 0x8d5524, 0xffdbac, 0xc68642, 0x8c5a2b];
    var shirts = [0x8e7dbe, 0xe07a5f, 0x81b29a, 0xf4a261, 0x3d405b, 0x2a9d8f, 0xb56576, 0x4ea8de, 0xe9c46a, 0x6d597a];
    var pants = [0x1d3557, 0x2b2d42, 0x3a3a3a, 0x5c4033, 0x22223b];

    peds = {
      body: new THREE.InstancedMesh(new THREE.BoxGeometry(0.62, 0.72, 0.36), mat(0xffffff), count),
      head: new THREE.InstancedMesh(new THREE.BoxGeometry(0.36, 0.36, 0.34), mat(0xffffff), count),
      cap: new THREE.InstancedMesh(new THREE.BoxGeometry(0.4, 0.12, 0.38), mat(0xffffff), count),
      legL: new THREE.InstancedMesh(new THREE.BoxGeometry(0.22, 0.66, 0.22), mat(0xffffff), count),
      legR: new THREE.InstancedMesh(new THREE.BoxGeometry(0.22, 0.66, 0.22), mat(0xffffff), count)
    };
    var r = rng(4242);
    for (var i = 0; i < count; i++) {
      var alongX = r() < 0.5;
      var road = ROADS[(r() * ROADS.length) | 0];
      var side = r() < 0.5 ? -1 : 1;
      var dir = r() < 0.5 ? -1 : 1;
      pedData.push({
        alongX: alongX,         
        road: road, side: side, dir: dir,
        t: -HALF + 4 + r() * (HALF * 2 - 8),
        speed: 1.1 + r() * 1.3,
        phase: r() * 6.28,
        off: 0,              
        shy: 0
      });
      peds.head.setColorAt(i, new THREE.Color(skins[(r() * skins.length) | 0]));
      peds.body.setColorAt(i, new THREE.Color(shirts[(r() * shirts.length) | 0]));
      peds.cap.setColorAt(i, new THREE.Color(r() < 0.5 ? 0x1f2937 : 0x8b2b2b));
      peds.legL.setColorAt(i, new THREE.Color(pants[(r() * pants.length) | 0]));
      peds.legR.setColorAt(i, new THREE.Color(pants[(r() * pants.length) | 0]));
    }
    for (var k in peds) {
      peds[k].castShadow = true;
      peds[k].frustumCulled = false;
      if (peds[k].instanceColor) peds[k].instanceColor.needsUpdate = true;
      scene.add(peds[k]);
    }
  }

  var dummy = new THREE.Object3D();
  function setPart(im, i, x, y, z, ry, rx, sx) {
    dummy.position.set(x, y, z);
    dummy.rotation.set(rx || 0, ry || 0, 0);
    var s = sx === undefined ? 1 : sx;
    dummy.scale.set(s, s, s);
    dummy.updateMatrix();
    im.setMatrixAt(i, dummy.matrix);
  }

  function updatePeds(dt, t) {
    if (!peds) return;
    var p0 = GC.player.state.pos;
    for (var i = 0; i < pedData.length; i++) {
      var p = pedData[i];
      var x, z, ry;
      if (p.alongX) {
        x = p.t; z = p.road + p.side * (LANE + p.off);
        ry = p.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
      } else {
        x = p.road + p.side * (LANE + p.off); z = p.t;
        ry = p.dir > 0 ? 0 : Math.PI;
      }
      var dx = x - p0.x, dz = z - p0.z;
      var d2 = dx * dx + dz * dz;
      if (d2 < 9) {
        p.shy = 1;
        p.off -= dt * 3.2;
        p.off = Math.max(-1.0, Math.min(1.0, p.off));
        p.speed = Math.max(0.35, p.speed - dt * 2.2);
      } else {
        p.shy = Math.max(0, p.shy - dt * 1.2);
        p.off -= (p.off > 0 ? 1 : (p.off < 0 ? -1 : 0)) * dt * 0.9;
        p.off = Math.max(-1.0, Math.min(1.0, p.off));
        p.speed += (1.1 + (i % 7) * 0.14 - p.speed) * Math.min(1, dt * 1.2);
      }
      p.t += p.dir * p.speed * dt;
      if (p.t > HALF - 3) { p.t = -HALF + 3; p.dir = -1; }
      if (p.t < -HALF + 3) { p.t = HALF - 3; p.dir = 1; }
      p.phase += dt * p.speed * 4.2;
      var swing = Math.sin(p.phase) * 0.7 * Math.min(1, p.speed);
      var bob = Math.abs(Math.sin(p.phase)) * 0.06;
      setPart(peds.body, i, x, 1.14 + bob, z, ry, 0);
      setPart(peds.head, i, x, 1.66 + bob, z, ry, 0);
      setPart(peds.cap, i, x, 1.88 + bob, z, ry, 0);
      setPart(peds.legL, i, x, 0.33 + bob, z, ry, swing);
      setPart(peds.legR, i, x, 0.33 + bob, z, ry, -swing);
    }
    for (var k in peds) peds[k].instanceMatrix.needsUpdate = true;
  }

  function makeCar(color, isPolice) {
    var g = new THREE.Group();
    var bodyMat = mat(color);
    var body = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.85, 4.2), bodyMat);
    body.position.y = 0.72; g.add(body);
    var cabin = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.72, 2.1), mat(isPolice ? 0xffffff : color));
    cabin.position.set(0, 1.42, -0.2); g.add(cabin);
    var glass = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.44, 2.15), mat(0x2a3b4d, { transparent: true, opacity: 0.75 }));
    glass.position.set(0, 1.5, -0.2); g.add(glass);
    var wheels = [];
    for (var i = 0; i < 4; i++) {
      var w = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.32, 10), mat(0x151515));
      w.rotation.z = Math.PI / 2;
      w.position.set(i % 2 ? 0.98 : -0.98, 0.42, i < 2 ? 1.35 : -1.35);
      g.add(w); wheels.push(w);
    }
    var lampL = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.24, 0.12), mat(0xfff3b0, { emissive: 0x776622 }));
    lampL.position.set(-0.6, 0.8, 2.12); g.add(lampL);
    var lampR = lampL.clone(); lampR.position.x = 0.6; g.add(lampR);
    var tailL = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.2, 0.12), mat(0xff3b30, { emissive: 0x661111 }));
    tailL.position.set(-0.6, 0.85, -2.12); g.add(tailL);
    var tailR = tailL.clone(); tailR.position.x = 0.6; g.add(tailR);
    var lightBar = null;
    if (isPolice) {
      lightBar = new THREE.Group();
      var red = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.28, 0.4), mat(0xff2222, { emissive: 0xaa0000 }));
      var blue = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.28, 0.4), mat(0x2255ff, { emissive: 0x0000aa }));
      red.position.x = -0.42; blue.position.x = 0.42;
      lightBar.add(red); lightBar.add(blue);
      lightBar.position.set(0, 1.9, -0.2);
      g.add(lightBar);
    }
    g.traverse(function (o) { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    g.userData = { wheels: wheels, lightBar: lightBar, red: lightBar && lightBar.children[0], blue: lightBar && lightBar.children[1] };
    return g;
  }

  function spawnCars(count) {
    var colors = [0xc1121f, 0x264653, 0xe9c46a, 0x2a9d8f, 0x8d99ae, 0xe07a5f, 0xf4a261];
    var r = rng(777);
    for (var i = 0; i < count; i++) {
      var mesh = makeCar(colors[i % colors.length], false);
      var cx = ROADS[(r() * (ROADS.length - 1)) | 0] + 16;
      var cz = ROADS[(r() * (ROADS.length - 1)) | 0] + 16;
      var off = 3.4;
      var path = [
        { x: cx - 16 + off, z: cz - 16 - off },
        { x: cx + 16 - off, z: cz - 16 - off },
        { x: cx + 16 - off, z: cz + 16 + off },
        { x: cx - 16 + off, z: cz + 16 + off }
      ];
      var c = {
        mesh: mesh, path: path, seg: 0, t: 0,
        speed: 7 + r() * 4, cruise: 7 + r() * 4,
        honkTimer: 0, honked: false
      };
      mesh.position.set(path[0].x, 0, path[0].z);
      scene.add(mesh);
      cars.push(c);
    }
  }

  function updateCar(c, dt, t) {
    var p0 = GC.player.state.pos;
    var a = c.path[c.seg], b = c.path[(c.seg + 1) % c.path.length];
    var dx = b.x - a.x, dz = b.z - a.z;
    var len = Math.sqrt(dx * dx + dz * dz) || 1;
    var nx = dx / len, nz = dz / len;
    var px = c.mesh.position.x, pz = c.mesh.position.z;
    var rx = p0.x - px, rz = p0.z - pz;
    var ahead = rx * nx + rz * nz;
    var side = Math.abs(rx * -nz + rz * nx);
    var blocked = ahead > 0 && ahead < 11 && side < 3.4;
    c.speed += ((blocked ? 0.6 : c.cruise) - c.speed) * Math.min(1, dt * (blocked ? 2.4 : 1.1));
    c.t += c.speed * dt;
    while (c.t > len) { c.t -= len; c.seg = (c.seg + 1) % c.path.length; a = c.path[c.seg]; b = c.path[(c.seg + 1) % c.path.length]; dx = b.x - a.x; dz = b.z - a.z; len = Math.sqrt(dx * dx + dz * dz) || 1; nx = dx / len; nz = dz / len; }
    c.mesh.position.set(a.x + nx * c.t, 0, a.z + nz * c.t);
    var targetYaw = Math.atan2(nx, nz);
    var diff = targetYaw - c.mesh.rotation.y;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    c.mesh.rotation.y += diff * Math.min(1, dt * 6);
    var spin = c.speed * dt * 2.2;
    var w = c.mesh.userData.wheels;
    for (var i = 0; i < w.length; i++) w[i].rotation.x += spin;
    if (blocked) {
      c.honkTimer -= dt;
      if (c.honkTimer <= 0) {
        c.honkTimer = 2.6;
        honkCount++;
        if (GC.audio) GC.audio.play('horn');
        if (GC.ui && Math.random() < 0.5) GC.ui.toast('HONK. HONK. HONK.');
        if (GC.game) GC.game.honked = (GC.game.honked || 0) + 1;
      }
    } else {
      c.honkTimer = 0;
    }
  }

  function updateCars(dt, t) {
    for (var i = 0; i < cars.length; i++) updateCar(cars[i], dt, t);
  }

  function addCharacter(opts) {
    var g = GC.makePerson({
      shirt: opts.shirt, pants: opts.pants, skin: opts.skin,
      cap: opts.cap ? mat(opts.cap) : null
    });
    g.position.set(opts.x, 0, opts.z);
    g.rotation.y = opts.facing === undefined ? 0 : opts.facing;
    scene.add(g);
    var ch = {
      group: g, x: opts.x, z: opts.z, name: opts.name,
      lines: opts.lines, busy: opts.busy || 'They look at you. That is all.',
      cooldown: 0, cooldownTime: opts.cooldownTime || 6,
      effect: opts.effect || null, kind: opts.kind || 'talk',
      radius: opts.radius || 2.6, phase: Math.random() * 6.28,
      wander: opts.wander || null
    };
    if (opts.build) opts.build(g);
    if (world && world.circles) world.circles.push({ x: opts.x, z: opts.z, r: 0.42 });
    characters.push(ch);
    return ch;
  }

  function buildCharacters() {
    addCharacter({
      name: 'FREE PIZZA GUY', x: 5.5, z: -7.2, shirt: 0x2ec4b6, pants: 0x1d3557, skin: 0xe0ac69,
      facing: -Math.PI / 2, kind: 'pizza',
      lines: [
        '"FREE PIZZA! No catch! Well. There is a catch. It is not free. But it is FREE."',
        '"Step right up, delivery boy! One coupon per customer! PER CUSTOMER!"',
        '"I have been standing here since the Hoover Dam. The pizza is still coming."'
      ],
      busy: '"One coupon per customer! You already used it! GO AWAY!"',
      effect: function () { if (GC.game && GC.game.giveFreePizza) GC.game.giveFreePizza(); }
    });
    addCharacter({
      name: 'BUSKER', x: -8.2, z: 2, shirt: 0x6d597a, pants: 0x3a3a3a, skin: 0xc68642,
      facing: Math.PI / 2, kind: 'music',
      lines: [
        '"This one is called Gravy Waltz. It is about a man who cannot stop cooking."',
        '"Tip me and I will play the sad trombone. TRUST ME."',
        '"I once played for the mayor. The mayor left. Not because of me. Probably not."'
      ],
      busy: '"One song per delivery driver. The rest of you: move along."',
      effect: function () {
        if (GC.game) { GC.game.tips += 1; GC.ui.toast('BUSKER TIPPED $1'); }
        GC.audio.play('coin');
      }
    });
    addCharacter({
      name: 'SECURITY GUARD', x: 24, z: 8.6, shirt: 0x264653, pants: 0x1b263b, skin: 0x8d5524,
      facing: Math.PI, kind: 'guard',
      lines: [
        '"Hey. HEY. You are the pizza guy, right? There is a dog on GRAVY BOULEVARD. Use the park."',
        '"If you knock on that door, nobody answers. Nobody has answered since 2019."',
        '"I get paid to stand here. Do not ask me what I am guarding. It is a box."'
      ],
      busy: '"I already told you about the dog. GO."'
    });
    addCharacter({
      name: 'MAN IN DINO SUIT', x: -8.2, z: -28, shirt: 0x3f7a3a, pants: 0x3f7a3a, skin: 0xffdbac,
      facing: Math.PI / 2, kind: 'dino',
      lines: [
        '"ROARRRR. I mean. I work here. I deliver sandwiches. Nobody tipped me either."',
        '"I am not a real dinosaur. I am a real guy in a suit. The suit cost more than my rent."',
        '"The pizza place closes at 11. The costume place closes at 9. Tough night for everyone."'
      ],
      busy: '"The dino is thinking. The dino has thoughts. They are slow thoughts."'
    });
    addCharacter({
      name: 'MAN ON BENCH', x: 6.5, z: 64, shirt: 0x457b9d, pants: 0x22223b, skin: 0xe0ac69,
      facing: -Math.PI / 2, kind: 'bench',
      lines: [
        '"Forty years I have lived on this bench. Forty years of pizza guys. You are the loud one."',
        '"I tipped a pizza guy once. 1998. He was crying. Do not make me cry again."',
        '"Take a seat. No? Then stand. Everybody stands. The bench is a museum now."'
      ],
      busy: '"Go on. The bench will be here. The bench is always here."'
    });
    addCharacter({
      name: 'SKATEBOARD KID', x: 40, z: 4, shirt: 0xf4a261, pants: 0x2a9d8f, skin: 0xffdbac,
      facing: -Math.PI / 2, kind: 'skate',
      lines: [
        '"Watch this. I am going to do a trick. It is called WALKING. It is very hard."',
        '"My mom says the pizza place is a scam. My mom is a pigeon."',
        '"I will not tip you. I have no money. I have a skateboard and one shoe."'
      ],
      busy: '"I already did the trick. Look. I did it again. Look."'
    });
  }

  function updateCharacters(dt, t) {
    for (var i = 0; i < characters.length; i++) {
      var c = characters[i];
      if (c.cooldown > 0) c.cooldown -= dt;
      if (c.wander) {
        c.wander.t += dt * c.wander.speed;
        c.x = c.wander.cx + Math.cos(c.wander.t) * c.wander.rx;
        c.z = c.wander.cz + Math.sin(c.wander.t * 1.3) * c.wander.rz;
        c.group.position.set(c.x, 0, c.z);
        c.group.rotation.y = Math.atan2(-Math.sin(c.wander.t) * c.wander.rx, Math.cos(c.wander.t * 1.3) * 1.3 * c.wander.rz);
        var u = c.group.userData;
        u.phase += dt * 5;
        var sw = Math.sin(u.phase) * 0.8;
        u.legL.rotation.x = sw; u.legR.rotation.x = -sw;
      } else {
        var u2 = c.group.userData;
        u2.phase += dt * 1.6;
        u2.body.rotation.z = Math.sin(u2.phase) * 0.03;
        u2.head.rotation.y = Math.sin(u2.phase * 0.7) * 0.5;
      }
    }
  }

  function nearestCharacter(pos, radius) {
    var best = null, bd = radius || 2.8;
    for (var i = 0; i < characters.length; i++) {
      var c = characters[i];
      var dx = pos.x - c.x, dz = pos.z - c.z;
      var d = Math.sqrt(dx * dx + dz * dz);
      if (d < bd) { bd = d; best = c; }
    }
    return best;
  }

  function talkTo(ch) {
    if (!ch) return false;
    if (ch.cooldown > 0) {
      GC.ui.say(ch.busy, true);
      return false;
    }
    ch.cooldown = ch.cooldownTime;
    var line = ch.lines[(Math.random() * ch.lines.length) | 0];
    GC.player.freeze(true);
    GC.ui.dialog(ch.name, [line], function () {
      GC.player.freeze(false);
    });
    if (ch.effect) ch.effect();
    return true;
  }

  function buildFunProps() {
    function solid(x, z, r) {
      if (world && world.circles) world.circles.push({ x: x, z: z, r: r });
    }
    var truck = new THREE.Group();
    var body = new THREE.Mesh(new THREE.BoxGeometry(2.6, 2.2, 5.4), mat(0xf4a261));
    body.position.y = 1.9; truck.add(body);
    var roof = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.2, 5.6), mat(0xe07a5f));
    roof.position.y = 3.05; truck.add(roof);
    var win = new THREE.Mesh(new THREE.BoxGeometry(2.7, 0.9, 2.2), mat(0x9fd8e8, { emissive: 0x20303a }));
    win.position.set(0, 2.2, 0.6); truck.add(win);
    var w1 = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.3, 12), mat(0x1a1a1a));
    w1.rotation.z = Math.PI / 2; w1.position.set(1.35, 0.55, -1.4); truck.add(w1);
    var w2 = w1.clone(); w2.position.z = 1.5; truck.add(w2);
    truck.position.set(-8.4, 0, 14);
    truck.rotation.y = Math.PI / 2;
    truck.traverse(function (o) { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    scene.add(truck);
    solid(-8.4, 14, 2.6);

    var cart = new THREE.Group();
    var cbody = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.0, 2.2), mat(0xc1121f));
    cbody.position.y = 1.3; cart.add(cbody);
    var ctop = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.14, 2.4), mat(0xffffff));
    ctop.position.y = 1.85; cart.add(ctop);
    var cwheel = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.2, 10), mat(0x1a1a1a));
    cwheel.rotation.z = Math.PI / 2; cwheel.position.set(0.85, 0.4, 0); cart.add(cwheel);
    var cwheel2 = cwheel.clone(); cwheel2.position.x = -0.85; cart.add(cwheel2);
    cart.position.set(9.2, 0, 36);
    cart.traverse(function (o) { if (o.isMesh) o.castShadow = true; });
    scene.add(cart);
    solid(9.2, 36, 1.3);

    var statue = new THREE.Group();
    var plinth = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.2, 2.2), mat(0x8f949b));
    plinth.position.y = 0.6; statue.add(plinth);
    var torso = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.8, 0.6), mat(0xb0a999));
    torso.position.y = 2.1; statue.add(torso);
    var head = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.6, 0.6), mat(0xb0a999));
    head.position.y = 3.2; statue.add(head);
    var arm = new THREE.Mesh(new THREE.BoxGeometry(0.25, 1.2, 0.25), mat(0xb0a999));
    arm.position.set(0.6, 2.3, 0); arm.rotation.z = -0.5; statue.add(arm);
    var pizzaArm = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.1, 12), mat(0xe9a23b));
    pizzaArm.position.set(0.9, 2.7, 0); pizzaArm.rotation.z = -0.5; statue.add(pizzaArm);
    statue.position.set(-3, 0, 66);
    statue.traverse(function (o) { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    scene.add(statue);
    solid(-3, 66, 1.4);

    var slide = new THREE.Group();
    var plat = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.3, 2.4), mat(0xe76f51));
    plat.position.y = 2.0; slide.add(plat);
    var ramp = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.2, 4.4), mat(0xf4a261));
    ramp.position.set(0, 1.1, 2.2); ramp.rotation.x = 0.42; slide.add(ramp);
    var ladder = new THREE.Mesh(new THREE.BoxGeometry(1.4, 2.0, 0.2), mat(0x457b9d));
    ladder.position.set(0, 1.0, -1.2); slide.add(ladder);
    slide.position.set(7, 0, 64);
    slide.traverse(function (o) { if (o.isMesh) o.castShadow = true; });
    scene.add(slide);
    solid(7, 64, 1.6);

    var swing = new THREE.Group();
    var barL = new THREE.Mesh(new THREE.BoxGeometry(0.18, 2.4, 0.18), mat(0x457b9d));
    barL.position.set(-1.4, 1.2, 0); swing.add(barL);
    var barR = barL.clone(); barR.position.x = 1.4; swing.add(barR);
    var top = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.18, 0.18), mat(0x457b9d));
    top.position.y = 2.4; swing.add(top);
    var seat = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.12, 0.4), mat(0x2a9d8f));
    seat.position.y = 0.9; swing.add(seat);
    var ropeL = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.5, 0.06), mat(0xdddddd));
    ropeL.position.set(-0.45, 1.65, 0); swing.add(ropeL);
    var ropeR = ropeL.clone(); ropeR.position.x = 0.45; swing.add(ropeR);
    swing.position.set(-6, 0, 62);
    swing.traverse(function (o) { if (o.isMesh) o.castShadow = true; });
    scene.add(swing);
    solid(-6, 62, 1.4);

    var spots = [[16, 16], [-16, 16], [16, -16], [-16, -16], [48, 48], [-48, -48],
                 [112, 112], [-112, -112], [112, -112], [-112, 112]];
    for (var i = 0; i < spots.length; i++) {
      var tl = new THREE.Group();
      var pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 4.4, 6), mat(0x2b3038));
      pole.position.y = 2.2; tl.add(pole);
      var boxm = new THREE.Mesh(new THREE.BoxGeometry(0.6, 1.5, 0.5), mat(0x1b1e24));
      boxm.position.y = 4.4; tl.add(boxm);
      var lamps = [];
      var cols = [0xff3b30, 0xffcc00, 0x2ecc71];
      for (var k = 0; k < 3; k++) {
        var l = new THREE.Mesh(new THREE.SphereGeometry(0.17, 8, 6), mat(cols[k], { emissive: cols[k] }));
        l.position.set(0, 4.95 - k * 0.45, 0.28);
        tl.add(l); lamps.push(l);
      }
      tl.position.set(spots[i][0] + 8.6, 0, spots[i][1] + 8.6);
      tl.traverse(function (o) { if (o.isMesh) o.castShadow = true; });
      scene.add(tl);
      (function (ls) {
        var idx = 0;
        var timer = 0;
        tl.userData.tick = function (dt) {
          timer -= dt;
          if (timer <= 0) { timer = 2.4; idx = (idx + 1) % 3; }
          for (var q = 0; q < 3; q++) ls[q].material.emissiveIntensity = (q === idx) ? 1 : 0.05;
        };
      })(lamps);
      trafficLights.push(tl);
    }

    var r = rng(99);
    for (var b = 0; b < 14; b++) {
      var a = r() * Math.PI * 2;
      var rad = 60 + r() * 30;
      var bag = new THREE.Mesh(new THREE.SphereGeometry(0.5, 8, 6), mat(0x2a2a30));
      bag.scale.set(1, 0.85, 1.1);
      bag.position.set(Math.cos(a) * rad, 0.42, Math.sin(a) * rad);
      bag.castShadow = true;
      scene.add(bag);
    }
    var board = new THREE.Group();
    var bpanel = new THREE.Mesh(new THREE.BoxGeometry(1.3, 1.6, 0.12), mat(0x1b1e24));
    bpanel.position.y = 1.1; board.add(bpanel);
    var bleg1 = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.2, 0.12), mat(0x8a5a3b));
    bleg1.position.set(-0.5, 0.6, 0.3); bleg1.rotation.x = 0.35; board.add(bleg1);
    var bleg2 = bleg1.clone(); bleg2.position.x = 0.5; board.add(bleg2);
    var bc = document.createElement('canvas');
    bc.width = 256; bc.height = 320;
    var bg = bc.getContext('2d');
    bg.fillStyle = '#1b1e24'; bg.fillRect(0, 0, 256, 320);
    bg.fillStyle = '#ffe14d';
    bg.font = 'bold 62px Impact, "Arial Black", sans-serif';
    bg.textAlign = 'center';
    bg.fillText('FREE', 128, 90);
    bg.fillText('PIZZA', 128, 150);
    bg.fillStyle = '#ff3b30';
    bg.font = 'bold 34px "Courier New", monospace';
    bg.fillText('(terms apply)', 128, 205);
    bg.fillStyle = '#7ee787';
    bg.font = 'bold 26px "Courier New", monospace';
    bg.fillText('1 COUPON', 128, 250);
    bg.fillText('PER PERSON', 128, 282);
    var btex = new THREE.CanvasTexture(bc);
    var bface = new THREE.Mesh(new THREE.PlaneGeometry(1.25, 1.55), new THREE.MeshBasicMaterial({ map: btex }));
    bface.position.set(0, 1.1, 0.07); board.add(bface);
    board.position.set(7.0, 0, -7.2);
    board.rotation.y = -Math.PI / 2;
    board.traverse(function (o) { if (o.isMesh) o.castShadow = true; });
    scene.add(board);
  }
  var trafficLights = [];

  function startPolice() {
    if (police) return;
    var mesh = makeCar(0x1b3a6b, true);
    var p0 = GC.player.state.pos;
    var rx = nearestRoadValue(p0.x), rz = nearestRoadValue(p0.z);
    mesh.position.set(rx + 3.4, 0, rz + 3.4);
    scene.add(mesh);
    police = { mesh: mesh, sirenTimer: 0, nagTimer: 0, active: true };
    if (GC.ui) {
      GC.ui.toast('THE POLICE HAVE BEEN CALLED');
      GC.ui.say('A police car turns onto your street. Slowly. Like it has all the time in the world.', true);
    }
  }

  function nearestRoadValue(v) {
    var best = ROADS[0], bd = 1e9;
    for (var i = 0; i < ROADS.length; i++) {
      var d = Math.abs(ROADS[i] - v);
      if (d < bd) { bd = d; best = ROADS[i]; }
    }
    return best;
  }
  function segmentClear(x1, z1, x2, z2) {
    if (!world || !world.colliders) return true;
    var INSET = 0.8;         
    var dx = x2 - x1, dz = z2 - z1;
    for (var i = 0; i < world.colliders.length; i++) {
      var c = world.colliders[i];
      var minX = c.minX + INSET, maxX = c.maxX - INSET;
      var minZ = c.minZ + INSET, maxZ = c.maxZ - INSET;
      if (minX > maxX || minZ > maxZ) continue;
      var t0 = 0, t1 = 1, ok = true;
      if (Math.abs(dx) < 1e-6) {
        if (x1 < minX || x1 > maxX) { ok = false; }
      } else {
        var a = (minX - x1) / dx, b = (maxX - x1) / dx;
        if (a > b) { var s = a; a = b; b = s; }
        t0 = Math.max(t0, a); t1 = Math.min(t1, b);
        if (t0 > t1) ok = false;
      }
      if (ok) {
        if (Math.abs(dz) < 1e-6) {
          if (z1 < minZ || z1 > maxZ) { ok = false; }
        } else {
          var a2 = (minZ - z1) / dz, b2 = (maxZ - z1) / dz;
          if (a2 > b2) { var s2 = a2; a2 = b2; b2 = s2; }
          t0 = Math.max(t0, a2); t1 = Math.min(t1, b2);
          if (t0 > t1) ok = false;
        }
      }
      if (ok) return false;  
    }
    return true;
  }

  function policeRoute(p0, m) {
    var mx = nearestRoadValue(m.position.x), mz = nearestRoadValue(m.position.z);
    var px = nearestRoadValue(p0.x), pz = nearestRoadValue(p0.z);
    var route = [];
    if (Math.abs(m.position.x - mx) > 1.2 || Math.abs(m.position.z - mz) > 1.2) {
      route.push({ x: mx, z: mz });          
    }
    var viaX = { x: px, z: mz };             
    var viaZ = { x: mx, z: pz };       
    var xOk = segmentClear(m.position.x, m.position.z, viaX.x, viaX.z);
    var zOk = segmentClear(m.position.x, m.position.z, viaZ.x, viaZ.z);
    route.push(xOk || !zOk ? viaX : viaZ);
    route.push({ x: px, z: pz });     
    var kerbX = { x: px, z: p0.z }, kerbZ = { x: p0.x, z: pz };
    route.push(Math.abs(p0.x - px) < Math.abs(p0.z - pz) ? kerbX : kerbZ);
    return route;
  }

  function updatePolice(dt, t) {
    if (!police) return;
    var p0 = GC.player.state.pos;
    var m = police.mesh;
    var dx = p0.x - m.position.x, dz = p0.z - m.position.z;
    var d = Math.sqrt(dx * dx + dz * dz) || 1;
    var direct = d < 6 || (d < 34 && segmentClear(m.position.x, m.position.z, p0.x, p0.z));
    var mvx = 0, mvz = 0;
    if (direct) {
      var spd = d > 9 ? 14 : 3.5;
      if (d > 3.2) {                
        mvx = dx / d * spd * dt;
        mvz = dz / d * spd * dt;
      }
    } else {
      if (!police.route || !police.routeTarget ||
          Math.abs(p0.x - police.routeTarget.x) > 3 || Math.abs(p0.z - police.routeTarget.z) > 3) {
        police.route = policeRoute(p0, m);
        police.routeTarget = { x: p0.x, z: p0.z };
      }
      var route = police.route;
      while (route.length > 1) {
        var w0 = route[0];
        if (Math.abs(m.position.x - w0.x) < 2.5 && Math.abs(m.position.z - w0.z) < 2.5) route.shift();
        else break;
      }
      var wp = route[0];
      if (wp) {
        var tx = wp.x - m.position.x, tz = wp.z - m.position.z;
        var spd2 = 12;
        if (Math.abs(tx) > 1.0) mvx = Math.sign(tx) * Math.min(Math.abs(tx), spd2 * dt);
        else if (Math.abs(tz) > 1.0) mvz = Math.sign(tz) * Math.min(Math.abs(tz), spd2 * dt);
        else mvx = (tx >= 0 ? 1 : -1) * spd2 * dt * 0.5;
        police.lastWp = wp;
      }
    }
    police.lastDirect = direct;
    m.position.x += mvx;
    m.position.z += mvz;
    var yaw = Math.atan2(mvx, mvz);
    if (Math.abs(mvx) + Math.abs(mvz) > 0.001) {
      var diff = yaw - m.rotation.y;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      m.rotation.y += diff * Math.min(1, dt * 3);
    }
    var w = m.userData.wheels;
    var spin = (Math.abs(mvx) + Math.abs(mvz)) * 2.2;
    for (var i = 0; i < w.length; i++) w[i].rotation.x += spin;
    var lb = m.userData.lightBar;
    if (lb) {
      var on = Math.sin(t * 9) > 0;
      m.userData.red.material.emissiveIntensity = on ? 2.2 : 0.15;
      m.userData.blue.material.emissiveIntensity = on ? 0.15 : 2.2;
    }
    police.sirenTimer -= dt;
    if (police.sirenTimer <= 0 && d < 30) {
      police.sirenTimer = 2.6;
      if (GC.audio) GC.audio.play('siren');
    }
    police.nagTimer -= dt;
    if (d < 7 && police.nagTimer <= 0) {
      police.nagTimer = 7;
      if (GC.ui) GC.ui.say('OFFICER: "License and insurance. Also, why is there a pigeon on your roof?"', true);
      if (GC.game) GC.game.policeNag = (GC.game.policeNag || 0) + 1;
    }
  }

  GC.city = {
    colliders: [],
    honks: 0,
    build: function (scn, wd) {
      scene = scn;
      world = wd;
      this.colliders = wd ? wd.colliders : [];
      buildPeds(pedCount);
      spawnCars(14);
      buildCharacters();
      buildFunProps();
    },
    reset: function () {
      honkCount = 0;
      if (police) { scene.remove(police.mesh); police = null; }
      for (var i = 0; i < characters.length; i++) characters[i].cooldown = 0;
    },
    startPolice: startPolice,
    get policeState() { return police; },
    nearestCharacter: nearestCharacter,
    talkTo: talkTo,
    get honkCount() { return honkCount; },
    update: function (dt, t) {
      updatePeds(dt, t);
      updateCars(dt, t);
      updateCharacters(dt, t);
      updatePolice(dt, t);
      for (var i = 0; i < trafficLights.length; i++) {
        if (trafficLights[i].userData.tick) trafficLights[i].userData.tick(dt);
      }
    }
  };
})();
