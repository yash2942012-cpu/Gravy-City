/* GRAVY CITY -- city generation, buildings, doors, props, collision */
(function () {
  var GC = (window.GC = window.GC || {});
  var THREE = window.THREE;

  var WORLD = 400;              // world spans -200..200
  var HALF = WORLD / 2;
  var ROADS = [];
  for (var rv = -176; rv <= 176; rv += 32) ROADS.push(rv);
  var BLOCK_CENTERS = [];
  for (var bx = -160; bx <= 160; bx += 32) {
    for (var bz = -160; bz <= 160; bz += 32) BLOCK_CENTERS.push([bx, bz]);
  }
  var PARK = [0, 160];          // big green space up north
  var POCKET_PARK = [0, 64];    // the old playground block, now a pocket park

  function isParkBlock(bx, bz) {
    return (bx === PARK[0] && bz === PARK[1]) || (bx === POCKET_PARK[0] && bz === POCKET_PARK[1]);
  }

  var BLD = [
    /* ---- delivery targets ---- */
    { x: 32, z: 32, w: 14, d: 12, h: 14, side: 'n', num: '88', name: 'SNEAR CORNER LIQUOR', street: 'PASTA AVE', apt: '', color: 0x2a9d8f },
    { x: -32, z: 32, w: 13, d: 12, h: 10, side: 'n', num: '90', name: "NUN'S BAIL OUT LOANS", street: 'PASTA AVE', apt: '', color: 0xe9c46a },
    { x: 32, z: 0, w: 13, d: 13, h: 18, side: 'w', num: '22', name: 'TALL ORDER LAW', street: 'DOUGH BLVD', apt: 'APT 12F', color: 0x264653 },
    { x: -32, z: 0, w: 13, d: 12, h: 12, side: 'e', num: '24', name: 'VR BASEMENT', street: 'TIP JAR WAY', apt: '', color: 0x6d597a },
    { x: 0, z: -32, w: 14, d: 11, h: 13, side: 's', num: '5', name: 'FUNERAL HOME & WIFI', street: 'BREAD LANE', apt: '', color: 0x3d405b },
    { x: 32, z: -32, w: 13, d: 12, h: 9, side: 's', num: '7', name: 'BEACON OF HOPE DENTISTRY', street: 'BREAD LANE', apt: 'SUITE 900', color: 0x81b29a },
    { x: -32, z: -32, w: 13, d: 11, h: 11, side: 's', num: '9', name: 'DONUT GOVT LOBBY', street: 'BREAD LANE', apt: '', color: 0xf4a261 },
    { x: 64, z: 32, w: 13, d: 12, h: 12, side: 'w', num: '55', name: 'THE NOODLE FACTORY', street: 'SAUCE STREET', apt: '', color: 0xe76f51 },
    { x: -64, z: -64, w: 14, d: 12, h: 15, side: 'n', num: '12', name: 'THE GHOST OF FLAT 3A', street: 'TOPPING TERRACE', apt: 'APT 3A', color: 0x588157 },
    { x: 64, z: -64, w: 13, d: 12, h: 10, side: 'e', num: '3', name: 'DIRE STRAIGHT PIZZA', street: 'GRAVY BOULEVARD', apt: '', color: 0xbc6c25 },
    /* ---- the pizza palace ---- */
    { x: 0, z: 0, w: 14, d: 11, h: 7.0, side: 'n', num: '1', name: 'GRAVY CITY SLICE', street: 'BREAD LANE', apt: '', color: 0xc1121f, restaurant: true },
    /* ---- filler: scenery that is definitely not your order ---- */
    { x: -32, z: -64, w: 13, d: 12, h: 9, name: 'MOONLIGHT MOTEL', color: 0x6d597a, plain: true },
    { x: 0, z: -64, w: 14, d: 12, h: 16, name: 'PARKING ENFORCEMENT HQ', color: 0x457b9d, plain: true },
    { x: 32, z: -64, w: 13, d: 12, h: 7, name: 'TIN FOIL RESTAURANT', color: 0x8d99ae, plain: true },
    { x: -64, z: -32, w: 13, d: 12, h: 8, side: 'w', name: 'THE LOAN SHARK SPA', color: 0x9c6644, plain: true },
    { x: 64, z: -32, w: 13, d: 12, h: 14, name: 'DUCK DERBY ARENA', color: 0xbc6c25, plain: true },
    { x: -64, z: 0, w: 14, d: 12, h: 10, name: 'EVERYTHING STORE', color: 0x588157, plain: true },
    { x: 64, z: 0, w: 13, d: 12, h: 11, name: 'CITY HALL OF BAD IDEAS', color: 0xa8dadc, plain: true },
    { x: -64, z: 32, w: 13, d: 12, h: 9, name: 'PAWN & PAWN', color: 0xe07a5f, plain: true },
    { x: 0, z: 32, w: 14, d: 12, h: 13, name: 'LATE NIGHT LAUNDRY', color: 0x3d405b, plain: true },
    { x: -32, z: 64, w: 13, d: 12, h: 18, name: 'CLOCK TOWER OF DOOM', color: 0x264653, plain: true },
    { x: 32, z: 64, w: 13, d: 12, h: 9, name: 'CHEESE WAREHOUSE', color: 0xe9c46a, plain: true },
    { x: 64, z: 64, w: 14, d: 12, h: 12, name: 'THE LAST BATHHOUSE', color: 0x6d597a, plain: true },
    /* ---- the outer city: everything from here out is scenery, but it is a lot of it ---- */
    { x: -160, z: -160, w: 14, d: 12, h: 22, name: 'TOWER OF NO RETURN', color: 0x264653, plain: true },
    { x: -128, z: -160, w: 13, d: 12, h: 11, name: 'AUTO BODY & SOUP', color: 0x6d597a, plain: true },
    { x: -96, z: -160, w: 13, d: 12, h: 16, name: 'WIRELESS TELEGRAPHY MUSEUM', color: 0x457b9d, plain: true },
    { x: -64, z: -160, w: 14, d: 12, h: 9, name: 'GRAVY CIVIC CENTRE', color: 0xa8dadc, plain: true },
    { x: -160, z: -128, w: 13, d: 12, h: 12, name: 'MOTEL OF LAST RESORT', color: 0xe07a5f, plain: true },
    { x: -96, z: -128, w: 13, d: 12, h: 20, name: 'THE GLASS CUBE', color: 0x588157, plain: true },
    { x: -64, z: -128, w: 13, d: 12, h: 8, name: 'DOG GROOMERS & BAIL BONDS', color: 0xe9c46a, plain: true },
    { x: -160, z: -96, w: 13, d: 12, h: 10, name: 'STEEL & SOUP FACTORY', color: 0x8d99ae, plain: true },
    { x: -128, z: -64, w: 13, d: 12, h: 13, name: 'THE SUBTERRANEAN', color: 0x3d405b, plain: true },
    { x: -160, z: -64, w: 14, d: 12, h: 9, name: 'CRANE & CRANE & CRANE', color: 0xbc6c25, plain: true },
    { x: -160, z: 0, w: 13, d: 12, h: 15, name: 'HOTEL GRAND GRAVY', color: 0x6d597a, plain: true },
    { x: -128, z: 0, w: 13, d: 12, h: 11, name: 'BUREAU OF DOUGH', color: 0x2a9d8f, plain: true },
    { x: -96, z: 0, w: 13, d: 12, h: 18, name: 'OBELISK TOWER', color: 0x264653, plain: true },
    { x: -160, z: 64, w: 13, d: 12, h: 12, name: 'CHEESE EMPORIUM', color: 0xe9c46a, plain: true },
    { x: -128, z: 64, w: 13, d: 12, h: 8, name: 'THRIFT & THRIVE', color: 0xe07a5f, plain: true },
    { x: -96, z: 64, w: 13, d: 12, h: 14, name: 'GRAVY TIMES BUILDING', color: 0x457b9d, plain: true },
    { x: -64, z: 96, w: 13, d: 12, h: 10, name: 'SWIMMING POOL SUPPLIES', color: 0x2a9d8f, plain: true },
    { x: -96, z: 128, w: 13, d: 12, h: 9, name: 'THE YELLOW HOUSE', color: 0xe9c46a, plain: true },
    { x: -64, z: 128, w: 14, d: 12, h: 17, name: 'SKYLINE APARTMENTS', color: 0x588157, plain: true },
    { x: -128, z: 96, w: 13, d: 12, h: 11, name: 'BOWLING & BREAKFAST', color: 0xbc6c25, plain: true },
    { x: -96, z: 160, w: 13, d: 12, h: 8, name: 'PARKING GARAGE (EMPTY)', color: 0x8d99ae, plain: true },
    { x: -32, z: 160, w: 13, d: 12, h: 13, name: 'HOUSE OF PANCAKES', color: 0xf4a261, plain: true },
    { x: 32, z: 160, w: 13, d: 12, h: 10, name: 'THE ROUNDABOUT DINER', color: 0xe76f51, plain: true },
    { x: 64, z: 160, w: 14, d: 12, h: 16, name: 'GRAVY GENERAL HOSPITAL', color: 0xa8dadc, plain: true },
    { x: 96, z: 160, w: 13, d: 12, h: 9, name: 'FIRE STATION 7', color: 0xc1121f, plain: true },
    { x: 96, z: 128, w: 13, d: 12, h: 12, name: 'LIBRARY OF LOST CAUSES', color: 0x457b9d, plain: true },
    { x: 128, z: 128, w: 13, d: 12, h: 19, name: 'THE MONOLITH', color: 0x264653, plain: true },
    { x: 96, z: 64, w: 13, d: 12, h: 11, name: 'BREAD & BUTTER BANK', color: 0xe9c46a, plain: true },
    { x: 128, z: 64, w: 13, d: 12, h: 8, name: 'GRAVY SCOUT HALL', color: 0x588157, plain: true },
    { x: 96, z: 0, w: 13, d: 12, h: 15, name: 'PARALLEL PARKING HQ', color: 0x2a9d8f, plain: true },
    { x: 128, z: 0, w: 13, d: 12, h: 10, name: 'THE PEPPERONI PALACE', color: 0xbc6c25, plain: true },
    { x: 160, z: 0, w: 14, d: 12, h: 13, name: 'SUNSET TOWERS', color: 0x6d597a, plain: true },
    { x: 128, z: -64, w: 13, d: 12, h: 9, name: 'PAWN SHOP & OPERA', color: 0xe07a5f, plain: true },
    { x: 160, z: -64, w: 13, d: 12, h: 17, name: 'THE PINNACLE', color: 0x264653, plain: true },
    { x: 96, z: -64, w: 13, d: 12, h: 11, name: 'LAUNDROMAT & LAWYERS', color: 0x457b9d, plain: true },
    { x: 96, z: -96, w: 13, d: 12, h: 8, name: 'TROPHY & TUNA', color: 0xe9c46a, plain: true },
    { x: 128, z: -128, w: 13, d: 12, h: 14, name: 'AIRPORT HANGAR (SMALL)', color: 0x8d99ae, plain: true },
    { x: 160, z: -128, w: 13, d: 12, h: 9, name: 'THE GLASS SHED', color: 0x588157, plain: true },
    { x: 96, z: -160, w: 13, d: 12, h: 12, name: 'GREASE MONKEYS', color: 0xbc6c25, plain: true },
    { x: 160, z: -160, w: 14, d: 12, h: 20, name: 'OBSIDIAN TOWER', color: 0x1b2230, plain: true },
    { x: 64, z: -160, w: 13, d: 12, h: 10, name: 'THE LAST GAS STATION', color: 0xc1121f, plain: true },
    /* ---- the rest of the grid: infill so the city does not look like one big car park ---- */
    { x: -32, z: -160, w: 13, d: 12, h: 9, name: 'DEAD END DELI', color: 0xe76f51, plain: true },
    { x: 0, z: -160, w: 13, d: 12, h: 7, name: 'MUNICIPAL POOL (CLOSED)', color: 0x457b9d, plain: true },
    { x: 32, z: -160, w: 13, d: 12, h: 15, name: 'PAWNEE TOWERS', color: 0x6d597a, plain: true },
    { x: 128, z: -160, w: 13, d: 12, h: 24, name: 'THE FOG BANK', color: 0x3d405b, plain: true },
    { x: -128, z: -96, w: 13, d: 12, h: 8, name: 'TINY DOOR MUSEUM', color: 0xe9c46a, plain: true },
    { x: -32, z: -128, w: 13, d: 12, h: 11, name: 'SCAFFOLDING SUPPLY', color: 0x8d99ae, plain: true },
    { x: 0, z: -128, w: 13, d: 12, h: 13, name: 'THE VELVET CURTAIN', color: 0x9c6644, plain: true },
    { x: 32, z: -128, w: 13, d: 12, h: 10, name: 'CARPET WAREHOUSE 2', color: 0xe07a5f, plain: true },
    { x: 64, z: -128, w: 13, d: 12, h: 9, name: 'DENTAL ANNEX B', color: 0x81b29a, plain: true },
    { x: -96, z: -96, w: 14, d: 12, h: 18, name: 'GRAVY BAPTIST CHURCH', color: 0xa8dadc, plain: true },
    { x: -32, z: -96, w: 13, d: 12, h: 8, name: 'CHOP SUEY PALACE', color: 0xc1121f, plain: true },
    { x: 0, z: -96, w: 14, d: 12, h: 12, name: 'NIGHT SHIFT STORAGE', color: 0x3d405b, plain: true },
    { x: 32, z: -96, w: 13, d: 12, h: 7, name: 'SOUP & SOCK EMPORIUM', color: 0x2a9d8f, plain: true },
    { x: 64, z: -96, w: 13, d: 12, h: 16, name: 'PARKING GARAGE (FULL)', color: 0x8d99ae, plain: true },
    { x: 128, z: -96, w: 13, d: 12, h: 14, name: 'THE OLD MILL', color: 0x9c6644, plain: true },
    { x: -96, z: -32, w: 13, d: 12, h: 10, name: 'BUREAU OF LOST KEYS', color: 0x457b9d, plain: true },
    { x: 96, z: -32, w: 13, d: 12, h: 9, name: 'THE PADDLE SHOP', color: 0x2a9d8f, plain: true },
    { x: 128, z: -32, w: 13, d: 12, h: 20, name: 'STAIRWAY TO NOWHERE', color: 0x264653, plain: true },
    { x: -96, z: 32, w: 13, d: 12, h: 8, name: 'FLOWER & FIREWORKS', color: 0xe76f51, plain: true },
    { x: 96, z: 32, w: 13, d: 12, h: 12, name: 'THE BACK OFFICE', color: 0x6d597a, plain: true },
    { x: 128, z: 32, w: 13, d: 12, h: 17, name: 'MOTHERSHIP DIM SUM', color: 0x588157, plain: true },
    { x: -128, z: -128, w: 13, d: 12, h: 11, name: 'POCKET PLAZA HOTEL', color: 0xbc6c25, plain: true },    { x: -96, z: 96, w: 13, d: 12, h: 13, name: 'ROOFTOP GARDEN (FAKE)', color: 0x81b29a, plain: true },
    { x: -32, z: 96, w: 13, d: 12, h: 10, name: 'THE LAST ARCADE', color: 0x3d405b, plain: true },
    { x: 0, z: 96, w: 13, d: 12, h: 8, name: 'BOOTLEG VIDEO', color: 0xe9c46a, plain: true },
    { x: 32, z: 96, w: 13, d: 12, h: 14, name: 'HOT DOG UNIVERSITY', color: 0xf4a261, plain: true },
    { x: 64, z: 96, w: 13, d: 12, h: 9, name: 'GRAVY SAVINGS & LOAN', color: 0x457b9d, plain: true },
    { x: 96, z: 96, w: 13, d: 12, h: 15, name: 'THE ATTIC', color: 0x9c6644, plain: true },
    { x: 128, z: 96, w: 13, d: 12, h: 21, name: 'SKYLINE PARKING', color: 0x8d99ae, plain: true },
    { x: -32, z: 128, w: 13, d: 12, h: 7, name: 'AUTOMOTIVE & AROMATHERAPY', color: 0x2a9d8f, plain: true },
    { x: 0, z: 128, w: 13, d: 12, h: 12, name: 'THE BROADWAY 4', color: 0xc1121f, plain: true },
    { x: 32, z: 128, w: 13, d: 12, h: 8, name: 'MERMAID DINER', color: 0x6d597a, plain: true },
    { x: 64, z: 128, w: 13, d: 12, h: 10, name: 'TATTOO & TAXES', color: 0xbc6c25, plain: true },
    { x: -64, z: 160, w: 14, d: 12, h: 19, name: 'GRAVY STADIUM (SMALL)', color: 0x588157, plain: true },
    { x: 128, z: 160, w: 13, d: 12, h: 16, name: 'THE OBSERVATORY', color: 0x264653, plain: true },
    { x: 160, z: 160, w: 13, d: 12, h: 11, name: 'LAST CHANCE FURNITURE', color: 0xe07a5f, plain: true },
    { x: -160, z: 32, w: 13, d: 12, h: 26, name: 'BROADCAST TOWER', color: 0x1b2230, plain: true },
    { x: -160, z: 96, w: 13, d: 12, h: 18, name: 'HOME OF THE 12TH FLOOR', color: 0x457b9d, plain: true }
  ];

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
  var rand = rng(1337);

  function mat(color, extra) {
    var m = new THREE.MeshLambertMaterial({ color: color });
    if (extra) for (var k in extra) m[k] = extra[k];
    return m;
  }

  /* ---------------- instancing helper ---------------- */
  var batches = {};
  function push(name, geo, material, x, y, z, ry, sx, sy, sz, rx) {
    var b = batches[name];
    if (!b) b = batches[name] = { geo: geo, mat: material, items: [] };
    if (b.items.length > 2400) return;
    b.items.push({
      x: x, y: y, z: z, ry: ry || 0, rx: rx || 0,
      sx: sx === undefined ? 1 : sx, sy: sy === undefined ? 1 : sy, sz: sz === undefined ? 1 : sz
    });
  }
  function flushBatches() {
    var dummy = new THREE.Object3D();
    for (var name in batches) {
      var b = batches[name];
      if (!b.items.length) continue;
      var im = new THREE.InstancedMesh(b.geo, b.mat, b.items.length);
      im.castShadow = true;
      im.receiveShadow = true;
      for (var i = 0; i < b.items.length; i++) {
        var it = b.items[i];
        dummy.position.set(it.x, it.y, it.z);
        dummy.rotation.set(it.rx, it.ry, 0);
        dummy.scale.set(it.sx, it.sy, it.sz);
        dummy.updateMatrix();
        im.setMatrixAt(i, dummy.matrix);
      }
      im.instanceMatrix.needsUpdate = true;
      scene.add(im);
    }
    batches = {};
  }

  /* ---------------- texture helpers ---------------- */
  function facadeTexture(colorHex, seed) {
    var r = rng(seed);
    var c = document.createElement('canvas');
    c.width = 256; c.height = 256;
    var g = c.getContext('2d');
    var col = new THREE.Color(colorHex);
    g.fillStyle = 'rgb(' + Math.floor(col.r * 255) + ',' + Math.floor(col.g * 255) + ',' + Math.floor(col.b * 255) + ')';
    g.fillRect(0, 0, 256, 256);
    for (var i = 0; i < 900; i++) {
      g.fillStyle = 'rgba(0,0,0,' + (r() * 0.09).toFixed(3) + ')';
      g.fillRect(r() * 256, r() * 256, 2 + r() * 5, 1 + r() * 2);
    }
    var cols = 4, rows = 4;
    var ww = 30, wh = 38, gapX = (256 - cols * ww) / (cols + 1), gapY = (256 - rows * wh) / (rows + 1);
    for (var ry = 0; ry < rows; ry++) {
      for (var rx = 0; rx < cols; rx++) {
        var x = gapX + rx * (ww + gapX), y = gapY + ry * (wh + gapY);
        var lit = r() < 0.35;
        g.fillStyle = lit ? '#ffdd88' : '#26303f';
        g.fillRect(x, y, ww, wh);
        g.fillStyle = 'rgba(255,255,255,0.14)';
        g.fillRect(x, y, ww, 5);
        g.fillStyle = 'rgba(0,0,0,0.35)';
        g.fillRect(x - 3, y - 3, ww + 6, 3);
        g.fillRect(x - 3, y + wh, ww + 6, 3);
        if (lit) {
          g.fillStyle = 'rgba(0,0,0,0.35)';
          g.fillRect(x + ww / 2 - 1, y, 2, wh);
        }
      }
    }
    var tex = new THREE.CanvasTexture(c);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.anisotropy = 4;
    return tex;
  }

  function signTexture(num, name, street, apt, bg) {
    var c = document.createElement('canvas');
    c.width = 512; c.height = 192;
    var g = c.getContext('2d');
    g.clearRect(0, 0, 512, 192);
    g.fillStyle = bg || 'rgba(12,14,20,0.92)';
    g.fillRect(0, 0, 512, 192);
    g.strokeStyle = '#ffcc00'; g.lineWidth = 8;
    g.strokeRect(4, 4, 504, 184);
    g.fillStyle = '#ffe14d';
    g.font = 'bold 74px Impact, "Arial Black", sans-serif';
    g.textAlign = 'center';
    g.fillText(num, 256, 76);
    g.fillStyle = '#ffffff';
    g.font = 'bold 25px "Courier New", monospace';
    var label = name.length > 27 ? name.slice(0, 26) + '.' : name;
    g.fillText(label, 256, 116);
    g.fillStyle = '#7ee787';
    g.font = 'bold 22px "Courier New", monospace';
    g.fillText(street + (apt ? '  ' + apt : ''), 256, 152);
    var tex = new THREE.CanvasTexture(c);
    tex.anisotropy = 4;
    return tex;
  }

  function shutterTexture() {
    var c = document.createElement('canvas');
    c.width = 128; c.height = 128;
    var g = c.getContext('2d');
    g.fillStyle = '#4a4f57'; g.fillRect(0, 0, 128, 128);
    for (var i = 0; i < 128; i += 8) {
      g.fillStyle = i % 16 === 0 ? '#3a3f46' : '#565c65';
      g.fillRect(0, i, 128, 6);
    }
    g.fillStyle = 'rgba(0,0,0,0.25)';
    g.fillRect(0, 100, 128, 28);
    var tex = new THREE.CanvasTexture(c);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    return tex;
  }

  function groundTexture() {
    var S = 2048, u = S / WORLD;
    var c = document.createElement('canvas');
    c.width = S; c.height = S;
    var g = c.getContext('2d');
    function wx(x) { return (x + HALF) * u; }
    function wz(z) { return (z + HALF) * u; }

    g.fillStyle = '#33373d';
    g.fillRect(0, 0, S, S);
    var r = rng(99);
    for (var i = 0; i < 42000; i++) {
      g.fillStyle = 'rgba(' + (r() * 255 | 0) + ',' + (r() * 255 | 0) + ',' + (r() * 255 | 0) + ',' + (r() * 0.12).toFixed(3) + ')';
      g.fillRect(r() * S, r() * S, 2, 2);
    }
    for (var b = 0; b < BLOCK_CENTERS.length; b++) {
      var bc = BLOCK_CENTERS[b];
      var x0 = wx(bc[0] - 9), y0 = wz(bc[1] - 9), sz = 18 * u;
      var isPark = isParkBlock(bc[0], bc[1]);
      g.fillStyle = isPark ? '#3f7a3a' : '#8f949b';
      g.fillRect(x0, y0, sz, sz);
      if (isPark) {
        for (var t = 0; t < 1400; t++) {
          g.fillStyle = 'rgba(' + (40 + r() * 60 | 0) + ',' + (120 + r() * 60 | 0) + ',' + (60 + r() * 40 | 0) + ',0.5)';
          g.fillRect(x0 + r() * sz, y0 + r() * sz, 3, 3);
        }
        g.fillStyle = '#6f9b62';
        g.beginPath(); g.arc(wx(bc[0]), wz(bc[1]), 4.2 * u, 0, Math.PI * 2); g.fill();
      } else {
        g.strokeStyle = 'rgba(0,0,0,0.12)'; g.lineWidth = 2;
        for (var p = 0; p < 6; p++) {
          g.beginPath();
          g.moveTo(x0 + (sz / 6) * p, y0); g.lineTo(x0 + (sz / 6) * p, y0 + sz);
          g.moveTo(x0, y0 + (sz / 6) * p); g.lineTo(x0 + sz, y0 + (sz / 6) * p);
          g.stroke();
        }
      }
    }
    g.fillStyle = '#e8c33a';
    for (var ri = 0; ri < ROADS.length; ri++) {
      var rv = ROADS[ri];
      for (var d = -HALF + 10; d < HALF - 10; d += 9) {
        g.fillRect(wx(rv) - 1.5, wz(d), 3, 5);
        g.fillRect(wx(d), wz(rv) - 1.5, 5, 3);
      }
    }
    g.fillStyle = 'rgba(240,240,240,0.72)';
    for (var rj = 0; rj < ROADS.length; rj++) {
      for (var rk = 0; rk < ROADS.length; rk++) {
        var ix = ROADS[rj], iz = ROADS[rk];
        for (var s = -5; s <= 5; s += 2) {
          g.fillRect(wx(ix) + s * u - 1, wz(iz) + 4.0 * u, 2, 3.0 * u);
          g.fillRect(wx(ix) + s * u - 1, wz(iz) - 7.0 * u, 2, 3.0 * u);
          g.fillRect(wx(ix) + 4.0 * u, wz(iz) + s * u - 1, 3.0 * u, 2);
          g.fillRect(wx(ix) - 7.0 * u, wz(iz) + s * u - 1, 3.0 * u, 2);
        }
      }
    }
    for (var m = 0; m < 90; m++) {
      var mx = r() * S, my = r() * S, mr = 3 + r() * 12;
      g.fillStyle = 'rgba(20,20,24,' + (0.08 + r() * 0.18).toFixed(2) + ')';
      g.beginPath(); g.arc(mx, my, mr, 0, Math.PI * 2); g.fill();
    }
    for (var mm = 0; mm < 40; mm++) {
      var hx = r() * S, hy = r() * S;
      g.fillStyle = '#4a4f57';
      g.beginPath(); g.arc(hx, hy, 7, 0, Math.PI * 2); g.fill();
      g.strokeStyle = '#33373d'; g.lineWidth = 2;
      g.beginPath(); g.arc(hx, hy, 4, 0, Math.PI * 2); g.stroke();
    }
    // the city limits, marked with a line of cones
    g.fillStyle = 'rgba(255,107,53,0.5)';
    for (var e = -HALF + 4; e < HALF - 2; e += 6) {
      g.fillRect(wx(e), wz(-HALF + 2), 2.4, 2.4);
      g.fillRect(wx(e), wz(HALF - 4.4), 2.4, 2.4);
      g.fillRect(wx(-HALF + 2), wz(e), 2.4, 2.4);
      g.fillRect(wx(HALF - 4.4), wz(e), 2.4, 2.4);
    }
    var tex = new THREE.CanvasTexture(c);
    tex.anisotropy = 8;
    return tex;
  }

  /* ---------------- person ---------------- */
  function makePerson(opts) {
    opts = opts || {};
    var g = new THREE.Group();
    var skin = opts.skin || 0xe0ac69;
    var shirt = opts.shirt || 0x2ec4b6;
    var pants = opts.pants || 0x1d3557;
    var skinM = mat(skin), shirtM = mat(shirt), pantsM = mat(pants);
    var darkM = mat(0x1a1a1a);

    var body = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.72, 0.36), shirtM);
    body.position.y = 1.14; g.add(body);
    var head = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.36, 0.34), skinM);
    head.position.y = 1.66; g.add(head);
    var cap = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.12, 0.38), opts.cap || mat(0x1f2937));
    cap.position.y = 1.88; g.add(cap);
    var brim = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.06, 0.2), opts.cap || mat(0x1f2937));
    brim.position.set(0, 1.83, 0.26); g.add(brim);

    var armL = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.58, 0.16), shirtM);
    var armR = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.58, 0.16), shirtM);
    armL.position.set(-0.39, 1.16, 0); armR.position.set(0.39, 1.16, 0);
    g.add(armL); g.add(armR);
    var legL = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.66, 0.22), pantsM);
    var legR = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.66, 0.22), pantsM);
    legL.position.set(-0.16, 0.33, 0); legR.position.set(0.16, 0.33, 0);
    g.add(legL); g.add(legR);
    var shoeL = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.12, 0.34), darkM);
    var shoeR = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.12, 0.34), darkM);
    shoeL.position.set(-0.16, 0.06, 0.05); shoeR.position.set(0.16, 0.06, 0.05);
    g.add(shoeL); g.add(shoeR);

    g.userData = { body: body, head: head, armL: armL, armR: armR, legL: legL, legR: legR, shoeL: shoeL, shoeR: shoeR, phase: 0 };
    g.traverse(function (o) { if (o.isMesh) { o.castShadow = true; } });
    return g;
  }
  GC.makePerson = makePerson;

  /* ---------------- world state ---------------- */
  var colliders = [];      // {minX,maxX,minZ,maxZ,h}
  var circles = [];        // {x,z,r}
  var doors = [];          // delivery targets
  var props = [];
  var scene, restaurant = null, marker = null;
  var customers = null, customerIndex = 0;

  function addBox(w, h, d, color, x, y, z, opts) {
    opts = opts || {};
    var m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(color, opts.mat));
    m.position.set(x, y, z);
    if (opts.rotY) m.rotation.y = opts.rotY;
    if (opts.shadow !== false) { m.castShadow = true; m.receiveShadow = true; }
    scene.add(m);
    return m;
  }

  function buildGround() {
    var geo = new THREE.PlaneGeometry(WORLD, WORLD);
    geo.rotateX(-Math.PI / 2);
    var mesh = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ map: groundTexture() }));
    mesh.position.y = 0;
    mesh.receiveShadow = true;
    scene.add(mesh);

    // skyline gets bigger
    var rs = rng(7);
    var items = [];
    for (var i = 0; i < 96; i++) {
      var ang = (i / 96) * Math.PI * 2 + rs() * 0.25;
      var dist = 160 + rs() * 140;
      items.push({
        x: Math.cos(ang) * dist, z: Math.sin(ang) * dist,
        w: 14 + rs() * 26, h: 24 + rs() * 92, d: 14 + rs() * 26,
        c: 0x1b2230 + ((rs() * 0x0c) | 0) * 0x010101
      });
    }
    var im = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), mat(0xffffff), items.length);
    var dummy = new THREE.Object3D();
    var col = new THREE.Color();
    for (var k = 0; k < items.length; k++) {
      var it = items[k];
      dummy.position.set(it.x, it.h / 2, it.z);
      dummy.scale.set(it.w, it.h, it.d);
      dummy.updateMatrix();
      im.setMatrixAt(k, dummy.matrix);
      im.setColorAt(k, col.setHex(it.c));
    }
    im.instanceMatrix.needsUpdate = true;
    if (im.instanceColor) im.instanceColor.needsUpdate = true;
    im.castShadow = false;
    im.receiveShadow = false;
    scene.add(im);
  }

  function doorPosition(spec) {
    var dx = spec.x, dz = spec.z;
    if (spec.side === 'n') { dz = spec.z - spec.d / 2; }
    else if (spec.side === 's') { dz = spec.z + spec.d / 2; }
    else if (spec.side === 'w') { dx = spec.x - spec.w / 2; }
    else { dx = spec.x + spec.w / 2; }
    return { x: dx, z: dz };
  }

  function facingRot(side) {
    if (side === 'n') return Math.PI;
    if (side === 's') return 0;
    if (side === 'w') return -Math.PI / 2;
    return Math.PI / 2;
  }

  function buildBuilding(spec, index) {
    var tex = facadeTexture(spec.color, 100 + index * 17);
    tex.repeat.set(1, Math.max(1, Math.round(spec.h / 7)));
    var sideMat = new THREE.MeshLambertMaterial({ map: tex });
    var plain = mat(spec.color);
    var boxGeo = new THREE.BoxGeometry(spec.w, spec.h, spec.d);
    var mats = [sideMat, sideMat, plain, plain, sideMat, sideMat];
    var mesh = new THREE.Mesh(boxGeo, mats);
    mesh.position.set(spec.x, spec.h / 2, spec.z);
    mesh.castShadow = true; mesh.receiveShadow = true;
    scene.add(mesh);

    // roof lip
    addBox(spec.w + 0.5, 0.5, spec.d + 0.5, 0x2b2f36, spec.x, spec.h + 0.2, spec.z, { shadow: false });
    // rooftop clutter (instanced, unit box scaled per item)
    var r = rng(500 + index);
    var unitBox = geo('unitBox', function () { return new THREE.BoxGeometry(1, 1, 1); });
    var unitCyl = geo('unitCyl', function () { return new THREE.CylinderGeometry(0.5, 0.5, 1, 10); });
    var n = 1 + ((r() * 3) | 0);
    for (var i = 0; i < n; i++) {
      var rw = 1 + r() * 2, rh = 0.6 + r() * 1.2, rd = 1 + r() * 2;
      push('roofBox', unitBox, mtl('roofBox', 0x54595f),
        spec.x + (r() - 0.5) * (spec.w - 3), spec.h + 0.45 + rh / 2, spec.z + (r() - 0.5) * (spec.d - 3), 0, rw, rh, rd);
    }
    if (r() < 0.4) {
      push('roofTank', unitCyl, mtl('roofTank', 0x7d5a45),
        spec.x + (r() - 0.5) * (spec.w - 4), spec.h + 1.3, spec.z + (r() - 0.5) * (spec.d - 4), 0, 2, 1.6, 2);
    }

    colliders.push({
      minX: spec.x - spec.w / 2, maxX: spec.x + spec.w / 2,
      minZ: spec.z - spec.d / 2, maxZ: spec.z + spec.d / 2,
      h: spec.h
    });

    var dp = doorPosition(spec);
    var rot = facingRot(spec.side);
    var outward = new THREE.Vector3(Math.sin(rot), 0, Math.cos(rot));

    var doorGroup = new THREE.Group();
    doorGroup.position.set(dp.x, 0, dp.z);
    doorGroup.rotation.y = rot;
    scene.add(doorGroup);

    var frame = new THREE.Mesh(new THREE.BoxGeometry(2.5, 3.5, 0.3), mat(0x1b1e24));
    frame.position.set(0, 1.75, 0);
    doorGroup.add(frame);

    if (spec.plain) {
      // a shop with the roller already down: you are not delivering here
      var shutTex = shutterTexture();
      shutTex.repeat.set(1.6, 1.2);
      var shutter = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 2.6), new THREE.MeshLambertMaterial({ map: shutTex }));
      shutter.position.set(0, 1.4, 0.17);
      doorGroup.add(shutter);
    } else {
      var panel = new THREE.Mesh(new THREE.BoxGeometry(2.0, 3.0, 0.16), mat(spec.restaurant ? 0x7a1620 : 0x2f3e4d));
      panel.position.set(0, 1.5, 0.16);
      doorGroup.add(panel);
      var win = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.8, 0.1), mat(0x9fd8e8, { emissive: 0x20303a }));
      win.position.set(0, 2.1, 0.26);
      doorGroup.add(win);
      var handle = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 6), mat(0xd4a017));
      handle.position.set(0.75, 1.5, 0.28);
      doorGroup.add(handle);
    }

    addBox(2.6, 0.16, 1.0, 0x7e8288, dp.x + outward.x * 0.45, 0.08, dp.z + outward.z * 0.45, { shadow: false });
    var doormat = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.2), mat(0x8b2b2b));
    doormat.rotation.x = -Math.PI / 2;
    doormat.position.set(dp.x + outward.x * 1.1, 0.02, dp.z + outward.z * 1.1);
    scene.add(doormat);

    if (!spec.restaurant && !spec.plain) {
      var sign = new THREE.Mesh(
        new THREE.PlaneGeometry(3.4, 1.28),
        new THREE.MeshBasicMaterial({ map: signTexture(spec.num, spec.name, spec.street, spec.apt), transparent: true })
      );
      sign.position.set(0, 4.35, 0.18);
      doorGroup.add(sign);

      var awn = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.16, 1.4), mat(0xc1121f));
      awn.position.set(0, 3.75, 0.6);
      awn.rotation.x = 0.12;
      doorGroup.add(awn);
      for (var s = -1; s <= 1; s += 2) {
        var st = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.9, 0.25), mat(0xcccccc));
        st.position.set(s * 1.5, 3.3, 0.9);
        doorGroup.add(st);
      }
    }

    var entry = {
      spec: spec, x: dp.x, z: dp.z, rot: rot,
      nx: outward.x, nz: outward.z,
      number: spec.num, name: spec.name, street: spec.street, apt: spec.apt,
      address: spec.num + ' ' + spec.street + (spec.apt ? ' ' + spec.apt : ''),
      customerIndex: -1, customerShown: false, customerT: 0,
      delivered: false
    };

    if (!spec.restaurant && !spec.plain) {
      doors.push(entry);
      entry.customerIndex = customerIndex++;
    }
    return entry;
  }

  /* ---------------- instanced residents waiting for pizza ---------------- */
  function buildCustomerPool(count) {
    customers = {
      body: new THREE.InstancedMesh(new THREE.BoxGeometry(0.62, 0.72, 0.36), mat(0xffffff), count),
      head: new THREE.InstancedMesh(new THREE.BoxGeometry(0.36, 0.36, 0.34), mat(0xffffff), count),
      cap: new THREE.InstancedMesh(new THREE.BoxGeometry(0.4, 0.12, 0.38), mat(0xffffff), count),
      legL: new THREE.InstancedMesh(new THREE.BoxGeometry(0.22, 0.66, 0.22), mat(0xffffff), count),
      legR: new THREE.InstancedMesh(new THREE.BoxGeometry(0.22, 0.66, 0.22), mat(0xffffff), count),
      shoeL: new THREE.InstancedMesh(new THREE.BoxGeometry(0.24, 0.12, 0.34), mat(0xffffff), count),
      shoeR: new THREE.InstancedMesh(new THREE.BoxGeometry(0.24, 0.12, 0.34), mat(0xffffff), count)
    };
    var skins = [0xe0ac69, 0x8d5524, 0xffdbac, 0xc68642];
    var shirts = [0x8e7dbe, 0xe07a5f, 0x81b29a, 0xf4a261, 0x3d405b, 0x2a9d8f, 0xb56576, 0x4ea8de];
    for (var k in customers) {
      var im = customers[k];
      im.castShadow = true;
      im.count = 0;
      im.frustumCulled = false;
      scene.add(im);
    }
    for (var i = 0; i < count; i++) {
      customers.head.setColorAt(i, new THREE.Color(skins[i % skins.length]));
      customers.body.setColorAt(i, new THREE.Color(shirts[i % shirts.length]));
      customers.cap.setColorAt(i, new THREE.Color(0x2b2b2b));
      customers.legL.setColorAt(i, new THREE.Color(0x2b2d42));
      customers.legR.setColorAt(i, new THREE.Color(0x2b2d42));
      customers.shoeL.setColorAt(i, new THREE.Color(0x1a1a1a));
      customers.shoeR.setColorAt(i, new THREE.Color(0x1a1a1a));
    }
    for (var k2 in customers) {
      if (customers[k2].instanceColor) customers[k2].instanceColor.needsUpdate = true;
    }
  }

  var dummyC = new THREE.Object3D();
  function setCustPart(im, i, x, y, z, ry, rx, scale) {
    dummyC.position.set(x, y, z);
    dummyC.rotation.set(rx || 0, ry || 0, 0);
    var s = scale === undefined ? 1 : scale;
    dummyC.scale.set(s, s, s);
    dummyC.updateMatrix();
    im.setMatrixAt(i, dummyC.matrix);
  }

  function updateCustomers(dt) {
    if (!customers) return;
    for (var d = 0; d < doors.length; d++) {
      var e = doors[d];
      var i = e.customerIndex;
      if (i < 0) continue;
      if (!e.customerShown) {
        setCustPart(customers.body, i, 0, -80, 0, 0, 0, 0);
        setCustPart(customers.head, i, 0, -80, 0, 0, 0, 0);
        setCustPart(customers.cap, i, 0, -80, 0, 0, 0, 0);
        setCustPart(customers.legL, i, 0, -80, 0, 0, 0, 0);
        setCustPart(customers.legR, i, 0, -80, 0, 0, 0, 0);
        setCustPart(customers.shoeL, i, 0, -80, 0, 0, 0, 0);
        setCustPart(customers.shoeR, i, 0, -80, 0, 0, 0, 0);
        continue;
      }
      e.customerT += dt;
      var bob = Math.abs(Math.sin(e.customerT * 6)) * 0.1;
      var x = e.x + e.nx * 1.15, z = e.z + e.nz * 1.15;
      var ry = e.rot + e.customerT * 0.5;
      var swing = Math.sin(e.customerT * 6) * 0.55;
      setCustPart(customers.body, i, x, 1.14 + bob, z, ry, 0);
      setCustPart(customers.head, i, x, 1.66 + bob, z, ry, 0);
      setCustPart(customers.cap, i, x, 1.88 + bob, z, ry, 0);
      setCustPart(customers.legL, i, x, 0.33 + bob, z, ry, swing);
      setCustPart(customers.legR, i, x, 0.33 + bob, z, ry, -swing);
      setCustPart(customers.shoeL, i, x, 0.06 + bob, z, ry, swing);
      setCustPart(customers.shoeR, i, x, 0.06 + bob, z, ry, -swing);
    }
    for (var k in customers) customers[k].instanceMatrix.needsUpdate = true;
  }

  /* ---------------- instanced props ---------------- */
  var GEO = {}, MAT = {};
  function geo(key, make) { if (!GEO[key]) GEO[key] = make(); return GEO[key]; }
  function mtl(key, color, extra) { if (!MAT[key]) MAT[key] = mat(color, extra); return MAT[key]; }

  function tree(x, z, s) {
    push('treeTrunk', geo('tTrunk', function () { return new THREE.CylinderGeometry(0.18, 0.26, 2.2, 7); }), mtl('tTrunk', 0x6b4a2f), x, 1.1 * s, z, 0, s, s, s);
    push('treeFol', geo('tFol', function () { return new THREE.IcosahedronGeometry(1.5, 0); }), mtl('tFol', 0x2f7d32), x, 3.0 * s, z, 0, s, s, s);
    push('treeFol2', geo('tFol2', function () { return new THREE.IcosahedronGeometry(1.05, 0); }), mtl('tFol2', 0x3d9b3f), x + 0.5 * s, 3.7 * s, z + 0.2 * s, 0, s, s, s);
    circles.push({ x: x, z: z, r: 0.55 * s });
  }

  function pushAt(name, geo, material, x, y, z, ry, lx, ly, lz) {
    var c = Math.cos(ry || 0), s = Math.sin(ry || 0);
    push(name, geo, material, x + lx * c + lz * s, y + (ly || 0), z - lx * s + lz * c, ry);
  }

  function lamp(x, z, rot) {
    push('lampPole', geo('lPole', function () { return new THREE.CylinderGeometry(0.09, 0.12, 5.2, 6); }), mtl('lPole', 0x2b3038), x, 2.6, z, rot);
    pushAt('lampArm', geo('lArm', function () { return new THREE.BoxGeometry(1.1, 0.12, 0.12); }), mtl('lArm', 0x2b3038), x, 5.15, z, rot, 0.5, 0, 0);
    pushAt('lampHead', geo('lHead', function () { return new THREE.BoxGeometry(0.7, 0.22, 0.4); }), mtl('lHead', 0xffe9a8, { emissive: 0x886644 }), x, 5.0, z, rot, 1.0, 0, 0);
    circles.push({ x: x, z: z, r: 0.22 });
  }

  function hydrant(x, z) {
    push('hydrantBody', geo('hBody', function () { return new THREE.CylinderGeometry(0.24, 0.28, 0.85, 8); }), mtl('hBody', 0xd62828), x, 0.42, z, 0);
    push('hydrantCap', geo('hCap', function () { return new THREE.SphereGeometry(0.24, 8, 6); }), mtl('hCap', 0xd62828), x, 0.88, z, 0);
    push('hydrantArm', geo('hArm', function () { return new THREE.BoxGeometry(0.8, 0.16, 0.16); }), mtl('hArm', 0xb81c1c), x, 0.6, z, 0);
    circles.push({ x: x, z: z, r: 0.35 });
  }

  function trashcan(x, z) {
    push('canBody', geo('cBody', function () { return new THREE.CylinderGeometry(0.45, 0.38, 1.1, 10); }), mtl('cBody', 0x3a4a3a), x, 0.55, z, 0);
    push('canLid', geo('cLid', function () { return new THREE.CylinderGeometry(0.5, 0.5, 0.12, 10); }), mtl('cLid', 0x2b3a2b), x, 1.16, z, 0);
    circles.push({ x: x, z: z, r: 0.55 });
  }

  function cone(x, z) {
    push('coneBody', geo('kBody', function () { return new THREE.ConeGeometry(0.32, 0.8, 10); }), mtl('kBody', 0xff6b35), x, 0.4, z, 0);
    push('coneBase', geo('kBase', function () { return new THREE.BoxGeometry(0.7, 0.07, 0.7); }), mtl('kBase', 0xe65c26), x, 0.04, z, 0);
    circles.push({ x: x, z: z, r: 0.4 });
  }

  function bench(x, z, rot) {
    push('benchSeat', geo('bSeat', function () { return new THREE.BoxGeometry(2.2, 0.12, 0.6); }), mtl('bSeat', 0x8a5a3b), x, 0.5, z, rot);
    pushAt('benchBack', geo('bBack', function () { return new THREE.BoxGeometry(2.2, 0.5, 0.1); }), mtl('bBack', 0x8a5a3b), x, 0.8, z, rot, 0, 0, -0.28);
    pushAt('benchLegA', geo('bLeg', function () { return new THREE.BoxGeometry(0.12, 0.5, 0.5); }), mtl('bLeg', 0x333333), x, 0.25, z, rot, -0.9, 0, 0);
    pushAt('benchLegB', geo('bLeg', function () { return new THREE.BoxGeometry(0.12, 0.5, 0.5); }), mtl('bLeg', 0x333333), x, 0.25, z, rot, 0.9, 0, 0);
    circles.push({ x: x, z: z, r: 0.7 });
  }

  function mailbox(x, z, rot) {
    push('mbBody', geo('mbBody', function () { return new THREE.BoxGeometry(0.7, 1.1, 0.55); }), mtl('mbBody', 0x2f4f6f), x, 0.7, z, rot);
    push('mbTop', geo('mbTop', function () { return new THREE.SphereGeometry(0.36, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2); }), mtl('mbTop', 0x2f4f6f), x, 1.25, z, rot);
    push('mbPost', geo('mbPost', function () { return new THREE.BoxGeometry(0.14, 0.6, 0.14); }), mtl('mbPost', 0x333333), x, 0.3, z, rot);
    circles.push({ x: x, z: z, r: 0.45 });
  }

  function newsbox(x, z, rot) {
    push('nbBody', geo('nbBody', function () { return new THREE.BoxGeometry(0.7, 1.1, 0.5); }), mtl('nbBody', 0xb5651d), x, 0.7, z, rot);
    pushAt('nbWindow', geo('nbWin', function () { return new THREE.BoxGeometry(0.5, 0.45, 0.06); }), mtl('nbWin', 0x9fd8e8, { emissive: 0x20303a }), x, 0.85, z, rot, 0, 0, 0.27);
    push('nbLegs', geo('nbLegs', function () { return new THREE.BoxGeometry(0.6, 0.25, 0.4); }), mtl('nbLegs', 0x333333), x, 0.12, z, rot);
    circles.push({ x: x, z: z, r: 0.45 });
  }

  function bike(x, z, rot) {
    push('bikeFrame', geo('biFrame', function () { return new THREE.BoxGeometry(0.12, 0.5, 1.5); }), mtl('biFrame', 0x2a9d8f), x, 0.62, z, rot);
    pushAt('bikeWheelA', geo('biWheel', function () { return new THREE.TorusGeometry(0.34, 0.07, 6, 12); }), mtl('biWheel', 0x222222), x, 0.36, z, rot, 0, 0, -0.62);
    pushAt('bikeWheelB', geo('biWheel', function () { return new THREE.TorusGeometry(0.34, 0.07, 6, 12); }), mtl('biWheel', 0x222222), x, 0.36, z, rot, 0, 0, 0.62);
    pushAt('bikeHandle', geo('biHandle', function () { return new THREE.BoxGeometry(0.5, 0.08, 0.08); }), mtl('biHandle', 0x333333), x, 0.95, z, rot, 0, 0, 0.6);
    circles.push({ x: x, z: z, r: 0.5 });
  }

  function phoneBooth(x, z, rot) {
    push('pbBody', geo('pbBody', function () { return new THREE.BoxGeometry(1.0, 2.3, 0.9); }), mtl('pbBody', 0xd62828), x, 1.15, z, rot);
    push('pbGlass', geo('pbGlass', function () { return new THREE.BoxGeometry(0.8, 1.5, 0.96); }), mtl('pbGlass', 0x9fd8e8, { emissive: 0x20303a }), x, 1.4, z, rot, 1, 1, 1, 0);
    push('pbTop', geo('pbTop', function () { return new THREE.BoxGeometry(1.1, 0.16, 1.0); }), mtl('pbTop', 0x222222), x, 2.38, z, rot);
    circles.push({ x: x, z: z, r: 0.7 });
  }

  function busStop(x, z, rot) {
    push('bsPost', geo('bsPost', function () { return new THREE.BoxGeometry(0.12, 2.6, 0.12); }), mtl('bsPost', 0x333333), x, 1.3, z, rot);
    pushAt('bsSign', geo('bsSign', function () { return new THREE.BoxGeometry(0.7, 0.7, 0.08); }), mtl('bsSign', 0xffcc00), x, 2.4, z, rot, 0, 0, 0.08);
    pushAt('bsSeat', geo('bsSeat', function () { return new THREE.BoxGeometry(1.6, 0.12, 0.4); }), mtl('bsSeat', 0x8a5a3b), x, 0.5, z, rot, 0, 0, 0.3);
    circles.push({ x: x, z: z, r: 0.5 });
  }

  function fountain(x, z) {
    var g = new THREE.Group();
    var basin = new THREE.Mesh(new THREE.CylinderGeometry(3.4, 3.6, 0.7, 20), mat(0x9aa0a6));
    basin.position.y = 0.35; g.add(basin);
    var water = new THREE.Mesh(new THREE.CylinderGeometry(3.1, 3.1, 0.1, 20), mat(0x3a7ca5, { emissive: 0x0a2634 }));
    water.position.y = 0.68; g.add(water);
    var mid = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.8, 1.6, 12), mat(0x9aa0a6));
    mid.position.y = 1.1; g.add(mid);
    var top = new THREE.Mesh(new THREE.SphereGeometry(0.5, 12, 10), mat(0x9aa0a6));
    top.position.y = 2.0; g.add(top);
    g.position.set(x, 0, z);
    g.traverse(function (o) { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    scene.add(g);
    circles.push({ x: x, z: z, r: 3.5 });
    return g;
  }

  function buildProps() {
    var r = rng(2024);
    var doorPoints = [];
    for (var d = 0; d < BLD.length; d++) doorPoints.push(doorPosition(BLD[d]));
    function tooClose(x, z, rad) {
      for (var i = 0; i < doorPoints.length; i++) {
        var dx = x - doorPoints[i].x, dz = z - doorPoints[i].z;
        if (dx * dx + dz * dz < rad * rad) return true;
      }
      return false;
    }
    function onRoad(x, z) {
      for (var i = 0; i < ROADS.length; i++) {
        if (Math.abs(x - ROADS[i]) < 8 || Math.abs(z - ROADS[i]) < 8) return true;
      }
      return false;
    }

    // the park: one green block, fully furnished
    fountain(PARK[0] - 3, PARK[1] + 2);
    tree(PARK[0] - 6.5, PARK[1] - 5, 1.05);
    tree(PARK[0] + 5.5, PARK[1] - 4, 0.9);
    tree(PARK[0] - 6, PARK[1] + 5.5, 0.8);
    tree(PARK[0] + 6, PARK[1] + 5, 1.0);
    bench(PARK[0] - 6, PARK[1] + 1, 0);
    bench(PARK[0] + 3, PARK[1] - 5.5, Math.PI / 2);
    bench(PARK[0] + 5, PARK[1] + 2, Math.PI);

    // street lamps: both sides of every road
    for (var ri = 0; ri < ROADS.length; ri++) {
      var rv = ROADS[ri];
      for (var p = -176; p <= 176; p += 24) {
        lamp(rv + 8.4, p, 0);
        lamp(rv - 8.4, p, Math.PI);
        lamp(p, rv + 8.4, Math.PI / 2);
        lamp(p, rv - 8.4, -Math.PI / 2);
      }
    }

    // trees lining the boulevards
    for (var ti = 0; ti < BLOCK_CENTERS.length; ti++) {
      var bc = BLOCK_CENTERS[ti];
      if (bc[0] === PARK[0] && bc[1] === PARK[1]) continue;
      tree(bc[0] - 8.4, bc[1] - 8.4, 0.7 + r() * 0.3);
      tree(bc[0] + 8.4, bc[1] + 8.4, 0.7 + r() * 0.3);
    }

    // scattered street furniture
    var placed = 0, guard = 0;
    while (placed < 190 && guard < 2200) {
      guard++;
      var x = -HALF + 12 + r() * (WORLD - 24);
      var z = -HALF + 12 + r() * (WORLD - 24);
      if (tooClose(x, z, 6) || onRoad(x, z)) continue;
      var roll = r();
      if (roll < 0.24) cone(x, z);
      else if (roll < 0.48) trashcan(x, z);
      else if (roll < 0.68) hydrant(x, z);
      else if (roll < 0.82) mailbox(x, z, r() * 6.28);
      else if (roll < 0.92) newsbox(x, z, r() * 6.28);
      else bike(x, z, r() * 6.28);
      placed++;
    }

    // a few landmarks with personality
    phoneBooth(-8.6, 12, Math.PI / 2);
    phoneBooth(42, -8.6, 0);
    phoneBooth(-8.6, -46, Math.PI / 2);
    busStop(8.6, 24, -Math.PI / 2);
    busStop(-40, 8.6, 0);
    busStop(56, 8.6, 0);
    busStop(8.6, -40, -Math.PI / 2);

    flushBatches();
  }

  function buildRestaurant() {
    var spec = BLD[10];
    var c = document.createElement('canvas');
    c.width = 1024; c.height = 256;
    var g = c.getContext('2d');
    g.fillStyle = '#150404'; g.fillRect(0, 0, 1024, 256);
    g.textAlign = 'center';
    g.font = 'bold 120px Impact, "Arial Black", sans-serif';
    g.fillStyle = '#ff3b30';
    g.shadowColor = '#ff3b30'; g.shadowBlur = 30;
    g.fillText('GRAVY CITY', 512, 110);
    g.fillStyle = '#ffcc00';
    g.shadowColor = '#ffcc00'; g.shadowBlur = 30;
    g.fillText('SLICE', 512, 220);
    var tex = new THREE.CanvasTexture(c);
    var sign = new THREE.Mesh(new THREE.PlaneGeometry(11, 2.75), new THREE.MeshBasicMaterial({ map: tex, transparent: true }));
    sign.position.set(0, 5.85, -5.82);
    sign.rotation.y = Math.PI;
    scene.add(sign);
    props.push({ type: 'neon', mesh: sign, tex: tex });

    var pc = document.createElement('canvas');
    pc.width = 256; pc.height = 256;
    var pg = pc.getContext('2d');
    pg.fillStyle = '#f5c542'; pg.beginPath(); pg.arc(128, 128, 118, 0, Math.PI * 2); pg.fill();
    pg.fillStyle = '#c1121f'; pg.beginPath(); pg.arc(128, 128, 104, 0, Math.PI * 2); pg.fill();
    for (var i = 0; i < 8; i++) {
      var a = (i / 8) * Math.PI * 2;
      pg.fillStyle = '#ffd9a0';
      pg.beginPath(); pg.arc(128 + Math.cos(a) * 58, 128 + Math.sin(a) * 58, 19, 0, Math.PI * 2); pg.fill();
    }
    var ptex = new THREE.CanvasTexture(pc);
    var psign = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 2.2), new THREE.MeshBasicMaterial({ map: ptex, transparent: true }));
    psign.position.set(7.4, 8.9, -5.82);
    psign.rotation.y = Math.PI;
    scene.add(psign);
    props.push({ type: 'spin', mesh: psign });

    // counter window + stack of boxes
    addBox(3.2, 1.6, 0.4, 0x2b2b2b, -5.4, 1.4, -5.7, { shadow: false });
    for (var b = 0; b < 4; b++) {
      addBox(1.1, 0.16, 1.1, 0xc9a227, -5.4, 0.9 + b * 0.17, -6.4, { shadow: false });
    }
    // the scooter that is not yours
    var sc = new THREE.Group();
    sc.position.set(7.6, 0, -7.2);
    sc.rotation.y = 0.5;
    var sb = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.5, 1.8), mat(0x2ec4b6)); sb.position.y = 0.62; sc.add(sb);
    var seat = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.18, 0.7), mat(0x1a1a1a)); seat.position.set(0, 0.95, -0.35); sc.add(seat);
    var st = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.95, 0.12), mat(0x333333)); st.position.set(0, 1.1, 0.75); sc.add(st);
    var bar = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.08, 0.08), mat(0x333333)); bar.position.set(0, 1.55, 0.75); sc.add(bar);
    var w1 = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.18, 12), mat(0x1a1a1a));
    w1.rotation.z = Math.PI / 2; w1.position.set(0, 0.32, 0.85); sc.add(w1);
    var w2 = w1.clone(); w2.position.z = -0.85; sc.add(w2);
    sc.traverse(function (o) { if (o.isMesh) o.castShadow = true; });
    scene.add(sc);
    circles.push({ x: 7.6, z: -7.2, r: 1.0 });

    restaurant = { x: 0, z: -7.4, door: doorPosition(spec), name: 'GRAVY CITY SLICE' };
  }

  function buildMarker() {
    marker = new THREE.Group();
    var coneM = new THREE.Mesh(new THREE.ConeGeometry(0.6, 1.3, 4), mat(0xffe14d, { emissive: 0x886600 }));
    coneM.rotation.x = Math.PI;
    coneM.position.y = 1.1;
    marker.add(coneM);
    var ring = new THREE.Mesh(new THREE.RingGeometry(0.8, 1.1, 16), new THREE.MeshBasicMaterial({ color: 0xffe14d, transparent: true, opacity: 0.7, side: THREE.DoubleSide }));
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.05;
    marker.add(ring);
    scene.add(marker);
  }

  GC.world = {
    build: function (scn) {
      scene = scn;
      buildGround();
      for (var i = 0; i < BLD.length; i++) buildBuilding(BLD[i], i);
      buildRestaurant();
      buildProps();
      buildMarker();
      buildCustomerPool(doors.length);
      return {
        doors: doors,
        restaurant: restaurant,
        colliders: colliders,
        circles: circles,
        roads: ROADS,
        blocks: BLOCK_CENTERS,
        park: PARK,
        parks: [PARK, POCKET_PARK],
        half: HALF,
        size: WORLD
      };
    },
    setMarkerTarget: function (entry) {
      marker.position.set(entry.x + entry.nx * 1.6, 0, entry.z + entry.nz * 1.6);
    },
    reset: function () {
      // everyone goes back inside for the new shift
      for (var i = 0; i < doors.length; i++) {
        doors[i].customerShown = false;
        doors[i].customerT = 0;
        doors[i].delivered = false;
      }
      updateCustomers(0);
    },
    updateMarker: function (dt, t) {
      if (!marker) return;
      marker.children[0].position.y = 1.15 + Math.sin(t * 3) * 0.22;
      marker.children[0].rotation.y += dt * 2;
      marker.children[1].material.opacity = 0.35 + Math.sin(t * 4) * 0.25;
    },
    update: function (dt, t) {
      for (var i = 0; i < props.length; i++) {
        var p = props[i];
        if (p.type === 'spin') p.mesh.rotation.y += dt * 0.8;
        if (p.type === 'neon' && Math.random() < 0.02) {
          p.mesh.material.opacity = 0.3;
          setTimeout(function () { if (p.mesh) p.mesh.material.opacity = 1; }, 90);
        }
      }
      updateCustomers(dt);
    }
  };
})();
