/* GRAVY CITY -- player controller, third person camera, collision */
(function () {
  var GC = (window.GC = window.GC || {});
  var THREE = window.THREE;

  var keys = {};
  var dragging = false;
  var locked = false;
  var pointer = { x: 0, y: 0, dx: 0, dy: 0 };
  var lockLostTimer = null;
  var camYaw = Math.PI, camPitch = 0.34;
  var person = null;
  var pizzaStack = [];
  var shakeAmt = 0;
  var stepTimer = 0;
  var camDist = 8.2;

  var P = {
    pos: new THREE.Vector3(0, 0, 18),
    vel: new THREE.Vector3(),
    yaw: 0,
    radius: 0.45,
    speed: 0,
    wobble: 0,
    slip: 0,
    canMove: true,
    frozen: false
  };

  var colliders = [], circles = [];

  function onKeyDown(e) {
    keys[e.code] = true;
    if (['Space', 'KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].indexOf(e.code) >= 0) e.preventDefault();
  }
  function onKeyUp(e) { keys[e.code] = false; }
  function onMouseDown(e) { if (e.button === 0) dragging = true; }
  function onMouseUp() { dragging = false; }
  function onMouseMove(e) {
    if (locked) {
      pointer.dx += e.movementX || 0;
      pointer.dy += e.movementY || 0;
    } else if (dragging) {
      pointer.dx += e.movementX || 0;
      pointer.dy += e.movementY || 0;
    }
  }
  function onLockChange() {
    locked = (document.pointerLockElement === document.body || document.pointerLockElement === document.getElementById('scene'));
    if (locked) {
      if (lockLostTimer) { clearTimeout(lockLostTimer); lockLostTimer = null; }
      return;
    }
    // the browser fires a null lock event while a request is still pending, so wait
    // a moment and only treat it as a real release if the mouse stays free
    if (lockLostTimer) clearTimeout(lockLostTimer);
    lockLostTimer = setTimeout(function () {
      lockLostTimer = null;
      if (locked) return;
      // a modal (the fake ad) deliberately drops the mouse -- do not pause for that
      if (GC.game && GC.game.state === 'playing' && !(GC.ui && GC.ui.isModalOpen())) GC.game.pause('pointer-lock-lost');
    }, 300);
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('mousedown', onMouseDown);
  window.addEventListener('mouseup', onMouseUp);
  window.addEventListener('mousemove', onMouseMove);
  document.addEventListener('pointerlockchange', onLockChange);

  function buildPizzaBox() {
    var g = new THREE.Group();
    var box = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.14, 0.62), new THREE.MeshLambertMaterial({ color: 0xd9a441 }));
    g.add(box);
    var lid = new THREE.Mesh(new THREE.BoxGeometry(0.64, 0.04, 0.64), new THREE.MeshLambertMaterial({ color: 0xefc15c }));
    lid.position.y = 0.09; g.add(lid);
    var pizza = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.03, 12), new THREE.MeshLambertMaterial({ color: 0xe9a23b }));
    pizza.position.y = 0.12; g.add(pizza);
    var sauce = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.035, 12), new THREE.MeshLambertMaterial({ color: 0xc1121f }));
    sauce.position.y = 0.135; g.add(sauce);
    g.traverse(function (o) { if (o.isMesh) o.castShadow = true; });
    return g;
  }

  function resolveAxis(axis) {
    var r = P.radius;
    for (var i = 0; i < colliders.length; i++) {
      var c = colliders[i];
      var cx = Math.max(c.minX, Math.min(P.pos.x, c.maxX));
      var cz = Math.max(c.minZ, Math.min(P.pos.z, c.maxZ));
      var dx = P.pos.x - cx, dz = P.pos.z - cz;
      var d2 = dx * dx + dz * dz;
      if (d2 >= r * r) continue;
      if (axis === 'x') {
        if (dx !== 0) {
          P.pos.x = cx + (dx > 0 ? r : -r);
          P.vel.x *= 0.2;
        } else {
          P.pos.x = (P.pos.x - c.minX < c.maxX - P.pos.x) ? c.minX - r : c.maxX + r;
          P.vel.x *= 0.2;
        }
      } else {
        if (dz !== 0) {
          P.pos.z = cz + (dz > 0 ? r : -r);
          P.vel.z *= 0.2;
        } else {
          P.pos.z = (P.pos.z - c.minZ < c.maxZ - P.pos.z) ? c.minZ - r : c.maxZ + r;
          P.vel.z *= 0.2;
        }
      }
    }
  }

  function resolveCircles() {
    for (var i = 0; i < circles.length; i++) {
      var c = circles[i];
      var dx = P.pos.x - c.x, dz = P.pos.z - c.z;
      var rr = c.r + P.radius;
      var d2 = dx * dx + dz * dz;
      if (d2 >= rr * rr || d2 === 0) continue;
      var d = Math.sqrt(d2);
      P.pos.x = c.x + dx / d * rr;
      P.pos.z = c.z + dz / d * rr;
      P.vel.x *= 0.6; P.vel.z *= 0.6;
    }
  }

  function cameraBlocked(dist, yaw, pitch) {
    // does the camera boom hit a building?
    var h = 2.2;
    var cp = Math.cos(pitch);
    var dirX = Math.sin(yaw) * cp;
    var dirZ = Math.cos(yaw) * cp;
    var dirY = Math.sin(pitch);
    var steps = 8;
    for (var s = 1; s <= steps; s++) {
      var t = dist * (s / steps);
      var px = P.pos.x + dirX * t;
      var pz = P.pos.z + dirZ * t;
      var py = h + dirY * t;
      for (var i = 0; i < colliders.length; i++) {
        var c = colliders[i];
        if (px > c.minX - 0.4 && px < c.maxX + 0.4 && pz > c.minZ - 0.4 && pz < c.maxZ + 0.4 && py < (c.h || 9) + 0.5) {
          return t;
        }
      }
    }
    return dist;
  }

  GC.player = {
    state: P,
    get camYaw() { return camYaw; },
    get camPitch() { return camPitch; },
    get keys() { return keys; },
    isLocked: function () { return locked; },

    create: function (scene, camera, spawn, worldData) {
      colliders = worldData.colliders;
      circles = worldData.circles;
      P.pos.set(spawn.x, 0, spawn.z);
      P.vel.set(0, 0, 0);

      person = GC.makePerson({ shirt: 0x2ec4b6, pants: 0x1d3557, skin: 0xe0ac69, cap: new THREE.MeshLambertMaterial({ color: 0xc1121f }) });
      scene.add(person);

      pizzaStack = [];
      for (var i = 0; i < 3; i++) {
        var b = buildPizzaBox();
        b.visible = false;
        b.position.set(0, 1.05 + i * 0.17, 0.55);
        person.add(b);
        pizzaStack.push(b);
      }
      GC.camera = camera;
      GC.scene = scene;
    },

    setCarried: function (n) {
      for (var i = 0; i < pizzaStack.length; i++) pizzaStack[i].visible = i < n;
    },

    shake: function (amt) { shakeAmt = Math.min(1.4, shakeAmt + amt); },

    setSlip: function (v) { P.slip = v; },
    freeze: function (v) { P.frozen = v; },

    reset: function (spawn) {
      P.pos.set(spawn.x, 0, spawn.z);
      P.vel.set(0, 0, 0);
      P.wobble = 0; P.slip = 0;
      camYaw = Math.PI; camPitch = 0.34; P.yaw = 0;
    },

    update: function (dt) {
      // look
      if (!GC.game || GC.game.state === 'playing') {
        camYaw -= pointer.dx * 0.0026;
        camPitch += pointer.dy * 0.0022;
        camPitch = Math.max(-0.25, Math.min(1.05, camPitch));
      }
      pointer.dx = 0; pointer.dy = 0;

      var active = P.canMove && !P.frozen && GC.game && GC.game.state === 'playing';

      // desired direction in camera space
      var ix = 0, iz = 0;
      if (active) {
        if (keys['KeyW'] || keys['ArrowUp']) iz -= 1;
        if (keys['KeyS'] || keys['ArrowDown']) iz += 1;
        if (keys['KeyA'] || keys['ArrowLeft']) ix -= 1;
        if (keys['KeyD'] || keys['ArrowRight']) ix += 1;
      }
      var len = Math.sqrt(ix * ix + iz * iz);
      var sprinting = active && (keys['ShiftLeft'] || keys['ShiftRight']) && len > 0;
      var maxSpeed = sprinting ? 10.2 : 6.2;
      if (P.slip > 0) maxSpeed *= 1.35;

      var wishX = 0, wishZ = 0;
      if (len > 0) {
        ix /= len; iz /= len;
        var cy = Math.cos(camYaw), sy = Math.sin(camYaw);
        // camera forward on the XZ plane
        wishX = ix * cy + iz * sy;
        wishZ = -ix * sy + iz * cy;
      }

      var accel = P.slip > 0 ? 12 : 62;
      P.vel.x += (wishX * maxSpeed - P.vel.x) * Math.min(1, accel * dt * 0.35);
      P.vel.z += (wishZ * maxSpeed - P.vel.z) * Math.min(1, accel * dt * 0.35);
      if (P.slip > 0) {
        P.vel.x *= 1 + 1.2 * dt;
        P.vel.z *= 1 + 1.2 * dt;
      }
      if (len === 0 && P.slip <= 0) {
        P.vel.x *= Math.max(0, 1 - 9 * dt);
        P.vel.z *= Math.max(0, 1 - 9 * dt);
      }

      // move + collide
      P.pos.x += P.vel.x * dt;
      resolveAxis('x');
      P.pos.z += P.vel.z * dt;
      resolveAxis('z');
      resolveCircles();
      var lim = 184;
      if (P.pos.x < -lim) { P.pos.x = -lim; P.vel.x = 0; }
      if (P.pos.x > lim) { P.pos.x = lim; P.vel.x = 0; }
      if (P.pos.z < -lim) { P.pos.z = -lim; P.vel.z = 0; }
      if (P.pos.z > lim) { P.pos.z = lim; P.vel.z = 0; }

      P.speed = Math.sqrt(P.vel.x * P.vel.x + P.vel.z * P.vel.z);

      // wobble: sprinting with 3 boxes shakes the stack
      var carried = 0;
      for (var s = 0; s < pizzaStack.length; s++) if (pizzaStack[s].visible) carried++;
      if (sprinting && carried >= 2) P.wobble += dt * 0.55;
      else P.wobble = Math.max(0, P.wobble - dt * 0.4);
      if (P.wobble >= 1) {
        P.wobble = 0;
        GC.game.onWobble && GC.game.onWobble();
      }

      // character facing + animation
      if (person) {
        person.position.set(P.pos.x, 0, P.pos.z);
        var targetYaw = P.yaw;
        if (P.speed > 0.35) targetYaw = Math.atan2(P.vel.x, P.vel.z);
        var diff = targetYaw - P.yaw;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        P.yaw += diff * Math.min(1, dt * 12);

        var u = person.userData;
        var ph = u.phase;
        ph += dt * (4 + P.speed * 1.5);
        u.phase = ph;
        var swing = Math.min(1, P.speed / 6.2);
        var wob = P.wobble * 0.5;
        u.legL.rotation.x = Math.sin(ph) * 0.9 * swing;
        u.legR.rotation.x = -Math.sin(ph) * 0.9 * swing;
        u.shoeL.position.z = 0.05 + Math.sin(ph) * 0.22 * swing;
        u.shoeR.position.z = 0.05 - Math.sin(ph) * 0.22 * swing;
        if (carried > 0) {
          u.armL.rotation.x = -1.15 + Math.sin(ph) * 0.08;
          u.armR.rotation.x = -1.15 - Math.sin(ph) * 0.08;
          u.body.rotation.z = Math.sin(ph * 0.5) * 0.03 + wob * 0.25;
        } else {
          u.armL.rotation.x = -Math.sin(ph) * 0.8 * swing;
          u.armR.rotation.x = Math.sin(ph) * 0.8 * swing;
          u.body.rotation.z = Math.sin(ph * 0.5) * 0.02;
        }
        u.body.rotation.x = wob * 0.12;
        person.rotation.y = P.yaw;

        // pizza stack rides on the chest
        for (var i = 0; i < pizzaStack.length; i++) {
          pizzaStack[i].rotation.z = Math.sin(ph * 0.8 + i) * (0.04 + wob * 0.5);
          pizzaStack[i].position.x = Math.sin(ph * 0.5 + i) * (0.03 + wob * 0.25);
        }
      }

      // footsteps
      if (P.speed > 1.2 && active) {
        stepTimer -= dt * P.speed;
        if (stepTimer <= 0) {
          stepTimer = 3.2;
          GC.audio.play('step');
        }
      }

      // camera
      var cam = GC.camera;
      if (cam) {
        var dist = camDist;
        var blocked = cameraBlocked(dist, camYaw, camPitch);
        var useDist = Math.min(dist, Math.max(1.6, blocked - 0.35));
        var cp = Math.cos(camPitch), sp = Math.sin(camPitch);
        var cx = P.pos.x + Math.sin(camYaw) * cp * useDist;
        var cz = P.pos.z + Math.cos(camYaw) * cp * useDist;
        var cy2 = 2.3 + sp * useDist;
        shakeAmt = Math.max(0, shakeAmt - dt * 2.2);
        var sh = shakeAmt * shakeAmt * 0.45;
        cam.position.set(
          cx + (Math.random() - 0.5) * sh,
          cy2 + (Math.random() - 0.5) * sh,
          cz + (Math.random() - 0.5) * sh
        );
        cam.lookAt(P.pos.x, 1.55 + P.speed * 0.02, P.pos.z);
      }
    }
  };
})();
