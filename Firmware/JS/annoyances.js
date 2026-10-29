(function () {
  var GC = (window.GC = window.GC || {});
  var THREE = window.THREE;

  var scene = null;
  var pigeons = [];
  var puddles = [];
  var smokes = [];
  var dog = null;
  var ringTimer = 0;
  var callActive = false;
  var gpsTimer = 0;
  var fakeTarget = null;
  var eventTimer = 22;
  var recent = [];
  var greaseTimer = 0;

  var LINES = {
    pigeons: [
      '&#128442; PIGEON ALERT: local pigeons have formed a BUSINESS UNION.',
      '&#128442; WARNING: pigeons have been briefed on your route.',
      '&#128442; Those pigeons are unionized and they know it.'
    ],
    grease: [
      '&#9888; GRAVITY CITY MUNICIPAL: the road is greasy. We did not do this.',
      '&#9888; NOTICE: slip hazard. We are not liable for your dignity.',
      '&#9888; Grease on the road. Some say it is a conspiracy.'
    ],
    mom: [
      '&#128222; INCOMING CALL: MOM',
      '&#128222; MOM: she "just needs a second"',
      '&#128222; Your mother is calling. She is not happy.'
    ],
    gps: [
      '&#128241; GPS RECALIBRATING... recalibrating... recalibrating...',
      '&#128241; Your GPS is now convinced you are in Ohio.',
      '&#128241; NAVIGATION ERROR: the arrow is pointing at a dumpster.'
    ],
    heat: [
      '&#128293; HEAT ADVISORY: your pizza is achieving sentience.',
      '&#128293; One pizza has entered the FIRE ZONE. Deliver it NOW.',
      '&#128293; Warning: cheese is bubbling. Act like you care.'
    ],
    dog: [
      '&#128054; A dog has been released into the wild. It has your scent.',
      '&#128054; DO NOT RUN. The dog has been reading about you.',
      '&#128054; Local dog has claimed your ankle as territory.'
    ],
    ad: [
      '&#128250; An advertisement has materialized on your screen.',
      '&#128250; A popup ad appeared. Nobody asked for this.',
      '&#128250; Your screen has become a billboard. Congrats.'
    ]
  };

  function pickLine(kind) {
    var arr = LINES[kind] || [''];
    return arr[(Math.random() * arr.length) | 0];
  }

  function randRange(a, b) { return a + Math.random() * (b - a); }

  function makePigeon() {
    var g = new THREE.Group();
    var bodyM = new THREE.MeshLambertMaterial({ color: 0x8d99ae });
    var body = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 6), bodyM);
    body.scale.set(1, 0.85, 1.5);
    g.add(body);
    var head = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), new THREE.MeshLambertMaterial({ color: 0x6b7a90 }));
    head.position.set(0, 0.14, 0.2);
    g.add(head);
    var beak = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.12, 5), new THREE.MeshLambertMaterial({ color: 0xe6a23c }));
    beak.rotation.x = Math.PI / 2;
    beak.position.set(0, 0.13, 0.32);
    g.add(beak);
    var wingL = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.03, 0.16), new THREE.MeshLambertMaterial({ color: 0x707d92 }));
    var wingR = wingL.clone();
    wingL.position.set(-0.2, 0.03, 0);
    wingR.position.set(0.2, 0.03, 0);
    g.add(wingL); g.add(wingR);
    var tail = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.03, 0.16), new THREE.MeshLambertMaterial({ color: 0x5c6779 }));
    tail.position.set(0, 0.02, -0.3);
    g.add(tail);
    g.userData = { wingL: wingL, wingR: wingR };
    g.scale.setScalar(1.5);
    return g;
  }

  function spawnPigeons() {
    var n = 4 + ((Math.random() * 4) | 0);
    for (var i = 0; i < n; i++) {
      var p = makePigeon();
      var a = randRange(0, Math.PI * 2);
      var r = randRange(9, 16);
      p.position.set(
        GC.player.state.pos.x + Math.cos(a) * r,
        randRange(4, 8),
        GC.player.state.pos.z + Math.sin(a) * r
      );
      scene.add(p);
      pigeons.push({
        mesh: p,
        angle: a,
        radius: r,
        height: p.position.y,
        speed: randRange(0.6, 1.1) * (Math.random() < 0.5 ? -1 : 1),
        state: 'circle',
        timer: randRange(1.2, 3),
        diveT: 0
      });
    }
  }

  function clearPigeons() {
    for (var i = 0; i < pigeons.length; i++) scene.remove(pigeons[i].mesh);
    pigeons.length = 0;
  }

  function updatePigeons(dt, t) {
    var p0 = GC.player.state.pos;
    for (var i = pigeons.length - 1; i >= 0; i--) {
      var p = pigeons[i];
      var m = p.mesh;
      if (p.state === 'circle') {
        p.angle += p.speed * dt;
        p.timer -= dt;
        var tx = p0.x + Math.cos(p.angle) * p.radius;
        var tz = p0.z + Math.sin(p.angle) * p.radius;
        m.position.x += (tx - m.position.x) * Math.min(1, dt * 2.2);
        m.position.z += (tz - m.position.z) * Math.min(1, dt * 2.2);
        m.position.y += (p.height + Math.sin(t * 2 + i) * 0.6 - m.position.y) * Math.min(1, dt * 2);
        m.rotation.y = -p.angle + (p.speed > 0 ? -Math.PI / 2 : Math.PI / 2);
        if (p.timer <= 0) { p.state = 'dive'; p.timer = randRange(1.1, 1.8); p.diveT = 0; }
      } else if (p.state === 'dive') {
        p.diveT += dt;
        var dx = p0.x - m.position.x, dz = p0.z - m.position.z;
        var d = Math.sqrt(dx * dx + dz * dz) || 1;
        var spd = 9;
        m.position.x += dx / d * spd * dt;
        m.position.z += dz / d * spd * dt;
        m.position.y += (1.25 - m.position.y) * Math.min(1, dt * 3);
        m.rotation.y = Math.atan2(dx, dz);
        if (d < 1.3) {
          GC.audio.play('coo');
          GC.player.shake(0.7);
          GC.game.onPigeonAttack();
          p.state = 'flee';
          p.timer = 3;
        } else if (p.diveT > 2.4) { p.state = 'circle'; p.timer = randRange(2, 4); p.radius = randRange(8, 14); }
      } else {
        p.timer -= dt;
        var dy = p0.y + 12 - m.position.y;
        m.position.y += dy * Math.min(1, dt * 1.5);
        m.position.x += Math.cos(p.angle + p.timer) * dt * 4;
        if (p.timer <= 0) {
          scene.remove(m);
          pigeons.splice(i, 1);
        }
      }
      var u = m.userData;
      u.wingL.rotation.z = Math.sin(t * 26 + i) * 0.9;
      u.wingR.rotation.z = -Math.sin(t * 26 + i) * 0.9;
    }
  }

  function spawnGrease() {
    var n = 4 + ((Math.random() * 4) | 0);
    var colliders = (GC.city && GC.city.colliders) || [];
    function blocked(x, z) {
      for (var i = 0; i < colliders.length; i++) {
        var c = colliders[i];
        if (x > c.minX - 1 && x < c.maxX + 1 && z > c.minZ - 1 && z < c.maxZ + 1) return true;
      }
      return false;
    }
    for (var i = 0; i < n; i++) {
      var x = randRange(-184, 184), z = randRange(-184, 184);
      for (var t = 0; t < 16 && blocked(x, z); t++) {
        x = randRange(-184, 184); z = randRange(-184, 184);
      }
      var g = new THREE.Mesh(
        new THREE.CircleGeometry(randRange(1.3, 2.6), 14),
        new THREE.MeshPhongMaterial({ color: 0x141414, shininess: 120, specular: 0x888888, transparent: true, opacity: 0.92 })
      );
      g.rotation.x = -Math.PI / 2;
      g.position.set(x, 0.03, z);
      scene.add(g);
      puddles.push({ mesh: g, x: x, z: z, r: 2.2 });
    }
  }

  function clearPuddles() {
    for (var i = 0; i < puddles.length; i++) scene.remove(puddles[i].mesh);
    puddles.length = 0;
  }

  function updateGrease(dt) {
    for (var i = 0; i < puddles.length; i++) {
      var p = puddles[i];
      var dx = GC.player.state.pos.x - p.x, dz = GC.player.state.pos.z - p.z;
      if (dx * dx + dz * dz < p.r * p.r) {
        if (GC.player.state.slip <= 0.05) {
          GC.audio.play('squeal');
          GC.player.shake(0.45);
          GC.ui.toast('WHOOPS. GREASE.');
        }
        GC.player.setSlip(Math.max(GC.player.state.slip, 1.6));
      }
    }
  }

  function makeDog() {
    var g = new THREE.Group();
    var fur = new THREE.MeshLambertMaterial({ color: 0x9c6644 });
    var body = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.4, 0.85), fur);
    body.position.y = 0.45; g.add(body);
    var head = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.36, 0.4), fur);
    head.position.set(0, 0.62, 0.5); g.add(head);
    var snout = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.16, 0.22), new THREE.MeshLambertMaterial({ color: 0x2b2b2b }));
    snout.position.set(0, 0.55, 0.72); g.add(snout);
    var earL = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.2, 0.08), new THREE.MeshLambertMaterial({ color: 0x6b4630 }));
    var earR = earL.clone();
    earL.position.set(-0.16, 0.8, 0.45); earR.position.set(0.16, 0.8, 0.45);
    g.add(earL); g.add(earR);
    var legs = [];
    for (var i = 0; i < 4; i++) {
      var l = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.32, 0.12), new THREE.MeshLambertMaterial({ color: 0x6b4630 }));
      l.position.set(i % 2 ? 0.16 : -0.16, 0.16, i < 2 ? 0.3 : -0.3);
      g.add(l); legs.push(l);
    }
    var tail = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.35), fur);
    tail.position.set(0, 0.62, -0.55); tail.rotation.x = 0.5; g.add(tail);
    g.traverse(function (o) { if (o.isMesh) o.castShadow = true; });
    g.userData = { legs: legs, tail: tail };
    return g;
  }

  function spawnDog() {
    var m = makeDog();
    var a = randRange(0, Math.PI * 2);
    m.position.set(
      GC.player.state.pos.x + Math.cos(a) * 22,
      0,
      GC.player.state.pos.z + Math.sin(a) * 22
    );
    scene.add(m);
    dog = { mesh: m, timer: 16, angry: 0 };
  }

  function clearDog() {
    if (dog) { scene.remove(dog.mesh); dog = null; }
  }

  function updateDog(dt, t) {
    if (!dog) return;
    dog.timer -= dt;
    if (dog.timer <= 0) { clearDog(); return; }
    var p0 = GC.player.state.pos;
    var m = dog.mesh;
    var dx = p0.x - m.position.x, dz = p0.z - m.position.z;
    var d = Math.sqrt(dx * dx + dz * dz) || 1;
    if (d > 2.2) {
      var spd = 4.6;
      m.position.x += dx / d * spd * dt;
      m.position.z += dz / d * spd * dt;
      m.rotation.y = Math.atan2(dx, dz);
      var ph = t * 9;
      for (var i = 0; i < m.userData.legs.length; i++) {
        m.userData.legs[i].rotation.x = Math.sin(ph + (i % 2) * Math.PI + (i < 2 ? 0 : 1.2)) * 0.7;
      }
    } else {
      m.rotation.y = Math.atan2(dx, dz);
      m.userData.tail.rotation.z = Math.sin(t * 12) * 0.6;
      if (dog.anger <= 0) {
        dog.anger = 2.4;
        GC.audio.play('bark');
        GC.player.shake(0.5);
        GC.ui.toast('WOOF.');
        GC.game.onDogBark();
      }
    }
    dog.anger -= dt;
  }

  function spawnSmoke() {
    var g = new THREE.Group();
    var p = GC.player.state.pos;
    g.position.set(p.x, 1.8, p.z);
    for (var i = 0; i < 3; i++) {
      var s = new THREE.Mesh(
        new THREE.SphereGeometry(0.12 + Math.random() * 0.1, 6, 5),
        new THREE.MeshBasicMaterial({ color: 0x444444, transparent: true, opacity: 0.65 })
      );
      s.position.set((Math.random() - 0.5) * 0.4, i * 0.2, (Math.random() - 0.5) * 0.4);
      g.add(s);
    }
    scene.add(g);
    smokes.push({ mesh: g, life: 1.6 });
  }

  function updateSmoke(dt) {
    for (var i = smokes.length - 1; i >= 0; i--) {
      var s = smokes[i];
      s.life -= dt;
      s.mesh.position.y += dt * 0.9;
      for (var j = 0; j < s.mesh.children.length; j++) {
        s.mesh.children[j].material.opacity = Math.max(0, s.mesh.children[j].material.opacity - dt * 0.5);
        s.mesh.children[j].position.x += (Math.random() - 0.5) * dt;
      }
      if (s.life <= 0) {
        scene.remove(s.mesh);
        smokes.splice(i, 1);
      }
    }
  }

  GC.annoyances = {
    init: function (scn) {
      scene = scn;
      eventTimer = 20;
    },
    reset: function () {
      clearPigeons(); clearPuddles(); clearDog();
      for (var i = 0; i < smokes.length; i++) scene.remove(smokes[i].mesh);
      smokes.length = 0;
      callActive = false; gpsTimer = 0; fakeTarget = null; eventTimer = 20; greaseTimer = 0;
      recent = [];
    },
    get phoneRinging() { return callActive; },
    get gpsFake() { return fakeTarget; },
    get puddles() { return puddles; },
    update: function (dt, t) {
      var game = GC.game;
      if (!game || game.state !== 'playing') return;

      eventTimer -= dt;
      if (eventTimer <= 0) {
        var progress = 1 - (game.timeLeft / game.shiftLength);
        eventTimer = Math.max(7, 21 - progress * 12) + Math.random() * 6;
        this.triggerRandom();
      }

      if (puddles.length) {
        greaseTimer -= dt;
        if (greaseTimer <= 0) { greaseTimer = 12; clearPuddles(); }
      }

      updatePigeons(dt, t);
      updateGrease(dt);
      updateDog(dt, t);
      updateSmoke(dt);

      if (GC.player.state.slip > 0) {
        GC.player.setSlip(Math.max(0, GC.player.state.slip - dt * 0.55));
      }

      if (callActive) {
        game.phoneTimer -= dt;
        ringTimer -= dt;
        if (ringTimer <= 0) {
          ringTimer = 2.4;
          GC.audio.play('ring');
        }
        if (game.phoneTimer <= 0) {
          callActive = false;
          GC.ui.hidePhone();
          game.onPhoneMissed();
        }
      }

      if (gpsTimer > 0) {
        gpsTimer -= dt;
        if (gpsTimer <= 0) {
          fakeTarget = null;
          GC.game.refreshTarget();
          GC.ui.toast('GPS RECOVERED');
        }
      }
    },
    triggerRandom: function () {
      var pool = ['pigeons', 'grease', 'mom', 'gps', 'dog', 'ad'];
      var weights = { pigeons: 1, grease: 1, mom: 1, gps: 1, dog: 1, ad: 1 };
      for (var i = 0; i < recent.length; i++) weights[recent[i]] = 0.35;
      var total = 0, list = [];
      for (var k in weights) { total += weights[k]; list.push(k); }
      var pick = Math.random() * total, acc = 0, chosen = list[0];
      for (var j = 0; j < list.length; j++) { acc += weights[list[j]]; if (pick <= acc) { chosen = list[j]; break; } }
      recent.push(chosen);
      if (recent.length > 3) recent.shift();
      this.trigger(chosen);
    },
    trigger: function (kind) {
      var game = GC.game;
      switch (kind) {
        case 'pigeons':
          spawnPigeons();
          GC.ui.say(pickLine('pigeons'), true);
          GC.audio.play('coo');
          break;
        case 'grease':
          spawnGrease();
          greaseTimer = 14;
          GC.ui.say(pickLine('grease'), true);
          break;
        case 'mom':
          callActive = true;
          game.phoneTimer = 12;
          ringTimer = 0;
          GC.ui.showPhone();
          GC.ui.say(pickLine('mom'), true);
          GC.audio.play('ring');
          break;
        case 'gps':
          fakeTarget = game.pickWrongTarget();
          gpsTimer = 9;
          GC.game.refreshTarget();
          GC.ui.say(pickLine('gps'), true);
          GC.audio.play('error');
          break;
        case 'heat':
          game.burnRandomPizza();
          GC.ui.say(pickLine('heat'), true);
          break;
        case 'dog':
          spawnDog();
          GC.ui.say(pickLine('dog'), true);
          break;
        case 'ad':
          GC.ui.showAd();
          GC.ui.say(pickLine('ad'), true);
          break;
      }
    },
    answerPhone: function () {
      if (!callActive) return false;
      callActive = false;
      GC.ui.hidePhone();
      GC.audio.play('click');
      return true;
    }
  };
})();
