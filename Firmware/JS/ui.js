/* GRAVY CITY -- HUD, minimap, ticker, overlays, fake ads */
(function () {
  var GC = (window.GC = window.GC || {});
  var THREE = window.THREE;

  var el = {};
  var miniCtx = null;
  var worldData = null;
  var adTimer = 0, adScanTimer = 0, adActive = false, adScanning = false;
  var modalOpen = false;
  var dialogQueue = [], dialogTimer = null, dialogDone = null;
  var toastTimer = null;
  var markerPulse = 0;

  function $(id) { return document.getElementById(id); }

  function init() {
    el.hud = $('hud');
    el.tips = $('stat-tips');
    el.pizzas = $('stat-pizzas');
    el.time = $('stat-time');
    el.target = $('stat-target-name');
    el.address = $('stat-address');
    el.ticker = $('ticker');
    el.carry = $('carry');
    el.prompt = $('prompt');
    el.toast = $('toast');
    el.vignette = $('vignette');
    el.flash = $('flash');
    el.ad = $('ad');
    el.adClaim = $('ad-claim');
    el.adClose = $('ad-close');
    el.adScan = $('ad-scan');
    el.adScanFill = $('ad-scan-fill');
    el.adScanText = $('ad-scan-text');
    el.phone = $('phone-icon');
    el.dialog = $('dialog');
    el.dialogName = $('dialog-name');
    el.dialogText = $('dialog-text');
    el.compass = $('compass');
    el.compassArrow = $('compass-arrow');
    el.results = $('results');
    el.resultsTitle = $('results-title');
    el.resultsGrade = $('results-grade');
    el.resultsStats = $('results-stats');
    el.resultsQuip = $('results-quip');
    el.menu = $('menu');
    el.pause = $('pause');
    el.loading = $('loading');

    miniCtx = $('minimap').getContext('2d');

    el.adClaim.addEventListener('click', onAdClaim);
    el.adClose.addEventListener('click', function () {
      GC.audio.play('bad');
      el.ad.style.transform = 'translateX(6px)';
      setTimeout(function () { el.ad.style.transform = ''; }, 120);
      GC.ui.say('That X button is decorative.', true);
    });
  }

  /* ---------------- ticker / toast ---------------- */
  var tickerTimer = null;
  function say(text, pop) {
    el.ticker.innerHTML = text;
    el.ticker.classList.toggle('pop', !!pop);
    el.ticker.style.opacity = '1';
    if (tickerTimer) clearTimeout(tickerTimer);
    tickerTimer = setTimeout(function () { el.ticker.style.opacity = '0.55'; }, 6000);
  }

  function toast(text) {
    el.toast.textContent = text;
    el.toast.classList.remove('show');
    void el.toast.offsetWidth;
    el.toast.classList.add('show');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.toast.classList.remove('show'); }, 2100);
  }

  function flash(alpha) {
    el.flash.style.opacity = alpha;
    setTimeout(function () { el.flash.style.opacity = 0; }, 90);
  }

  /* ---------------- fake ad ---------------- */
  function onAdClaim() {
    if (adScanning) return;
    adScanning = true;
    el.adClaim.disabled = true;
    el.adClaim.textContent = 'PROCESSING...';
    el.adScan.classList.remove('hidden');
    el.adScanText.textContent = 'SCANNING YOUR DELIVERY LICENSE...';
    el.adScanFill.style.width = '0%';
    GC.audio.play('error');
    var pct = 0;
    adScanTimer = setInterval(function () {
      pct += 7 + Math.random() * 9;
      if (pct >= 100) {
        pct = 100;
        clearInterval(adScanTimer);
        el.adScanText.textContent = 'SCAN COMPLETE. YOU HAVE 0 VIRUSES.';
        GC.audio.play('bad');
        GC.game.onAdClaimed();
        setTimeout(function () {
          hideAd();
        }, 1600);
      }
      el.adScanFill.style.width = pct + '%';
    }, 140);
  }

  function showAd() {
    adActive = true;
    adScanning = false;
    adTimer = 13;
    modalOpen = true;
    el.ad.classList.remove('hidden');
    el.ad.style.transform = '';
    el.adClaim.disabled = false;
    el.adClaim.textContent = 'CLAIM MY FREE PIZZA';
    el.adScan.classList.add('hidden');
    el.adScanFill.style.width = '0%';
    // the ad grabs your mouse. this is the whole point.
    if (document.pointerLockElement && document.exitPointerLock) {
      try { document.exitPointerLock(); } catch (e) { }
    }
  }

  function hideAd() {
    adActive = false;
    adScanning = false;
    modalOpen = false;
    if (adScanTimer) { clearInterval(adScanTimer); adScanTimer = null; }
    el.ad.classList.add('hidden');
    // take the mouse back
    if (GC.game && GC.game.state === 'playing' && GC.game.requestLock) GC.game.requestLock();
  }

  /* ---------------- phone ---------------- */
  function showPhone() { el.phone.classList.remove('hidden'); }
  function hidePhone() { el.phone.classList.add('hidden'); }

  /* ---------------- dialogue ---------------- */
  function dialog(name, lines, done) {
    dialogQueue = lines.slice();
    dialogDone = done || null;
    el.dialogName.textContent = name;
    el.dialog.classList.remove('hidden');
    nextDialogLine();
  }
  function nextDialogLine() {
    if (dialogTimer) { clearTimeout(dialogTimer); dialogTimer = null; }
    if (!dialogQueue.length) {
      el.dialog.classList.add('hidden');
      var d = dialogDone; dialogDone = null;
      if (d) d();
      return;
    }
    var line = dialogQueue.shift();
    el.dialogText.textContent = '';
    var i = 0;
    var type = setInterval(function () {
      el.dialogText.textContent = line.slice(0, ++i);
      if (i >= line.length) {
        clearInterval(type);
        dialogTimer = setTimeout(nextDialogLine, 1100);
      }
    }, 22);
  }
  function hideDialog() {
    if (dialogTimer) { clearTimeout(dialogTimer); dialogTimer = null; }
    dialogQueue = [];
    el.dialog.classList.add('hidden');
  }

  /* ---------------- minimap ---------------- */
  var MINI_SIZE = 230, MINI_RANGE = 420; // world units across
  function drawMinimap(t) {
    if (!miniCtx) return;
    var g = miniCtx;
    var cx = GC.player.state.pos.x, cz = GC.player.state.pos.z;
    var scale = MINI_SIZE / MINI_RANGE;
    function tx(x) { return (x - cx) * scale + MINI_SIZE / 2; }
    function tz(z) { return (z - cz) * scale + MINI_SIZE / 2; }

    g.clearRect(0, 0, MINI_SIZE, MINI_SIZE);
    g.fillStyle = '#14171c';
    g.fillRect(0, 0, MINI_SIZE, MINI_SIZE);

    // roads
    g.fillStyle = '#2b3038';
    var roads = (worldData && worldData.roads) || [-48, -16, 16, 48];
    for (var i = 0; i < roads.length; i++) {
      var rw = 14 * scale;
      g.fillRect(tx(roads[i]) - rw / 2, 0, rw, MINI_SIZE);
      g.fillRect(0, tz(roads[i]) - rw / 2, MINI_SIZE, rw);
    }
    // buildings
    if (worldData) {
      g.fillStyle = '#59606b';
      for (var c = 0; c < worldData.colliders.length; c++) {
        var b = worldData.colliders[c];
        g.fillRect(tx(b.minX), tz(b.minZ), (b.maxX - b.minX) * scale, (b.maxZ - b.minZ) * scale);
      }
    }
    // the parks
    if (worldData) {
      var parks = worldData.parks || (worldData.park ? [worldData.park] : []);
      g.fillStyle = '#3f7a3a';
      for (var pk = 0; pk < parks.length; pk++) {
        g.fillRect(tx(parks[pk][0] - 9), tz(parks[pk][1] - 9), 18 * scale, 18 * scale);
      }
    }
    // restaurant
    if (worldData && worldData.restaurant) {
      var rr = worldData.restaurant;
      g.fillStyle = '#c1121f';
      g.fillRect(tx(rr.x - 3.5), tz(rr.z - 1), 7 * scale, 2 * scale);
      g.fillStyle = '#ff8080';
      g.font = 'bold 8px monospace';
      g.fillText('PIZZA', tx(rr.x - 3), tz(rr.z + 1.5));
    }
    // grease slicks
    var puddles = GC.annoyances.puddles;
    if (puddles) {
      g.fillStyle = 'rgba(10,10,14,0.85)';
      for (var pd = 0; pd < puddles.length; pd++) {
        g.beginPath();
        g.arc(tx(puddles[pd].x), tz(puddles[pd].z), puddles[pd].r * scale, 0, Math.PI * 2);
        g.fill();
      }
    }
    // target
    var tgt = GC.annoyances.gpsFake || GC.game.currentTarget;
    if (tgt) {
      var px = tx(tgt.x), pz = tz(tgt.z);
      var pulse = 4 + Math.sin(t * 5) * 2;
      g.fillStyle = GC.annoyances.gpsFake ? '#ff3b30' : '#ffe14d';
      g.beginPath();
      g.arc(px, pz, pulse, 0, Math.PI * 2);
      g.fill();
      g.strokeStyle = g.fillStyle;
      g.lineWidth = 1.5;
      g.beginPath();
      g.moveTo(px - 7, pz); g.lineTo(px + 7, pz);
      g.moveTo(px, pz - 7); g.lineTo(px, pz + 7);
      g.stroke();
    }
    // player
    var ppx = MINI_SIZE / 2, ppz = MINI_SIZE / 2;
    g.save();
    g.translate(ppx, ppz);
    g.rotate(-GC.player.state.yaw + Math.PI);
    g.fillStyle = '#7ee787';
    g.beginPath();
    g.moveTo(0, -6); g.lineTo(4.5, 5); g.lineTo(0, 2.5); g.lineTo(-4.5, 5);
    g.closePath(); g.fill();
    g.restore();
    // frame
    g.strokeStyle = '#3d5a80';
    g.lineWidth = 2;
    g.strokeRect(1, 1, MINI_SIZE - 2, MINI_SIZE - 2);
    g.fillStyle = '#6f8296';
    g.font = 'bold 9px monospace';
    g.fillText('N', MINI_SIZE / 2 - 3, 11);
  }

  /* ---------------- results ---------------- */
  function showResults(data) {
    el.resultsTitle.textContent = data.title || 'SHIFT OVER';
    el.resultsGrade.textContent = 'GRADE: ' + data.grade;
    var rows = data.rows || [];
    var html = '';
    for (var i = 0; i < rows.length; i++) {
      html += '<div><span>' + rows[i][0] + '</span><span>' + rows[i][1] + '</span></div>';
    }
    el.resultsStats.innerHTML = html;
    el.resultsQuip.textContent = data.quip;
    el.results.classList.remove('hidden');
  }

  GC.ui = {
    init: init,
    isModalOpen: function () { return modalOpen; },
    say: say,
    toast: toast,
    flash: flash,
    showAd: showAd,
    hideAd: hideAd,
    showPhone: showPhone,
    hidePhone: hidePhone,
    dialog: dialog,
    hideDialog: hideDialog,
    showResults: showResults,
    setWorld: function (wd) { worldData = wd; },
    setStats: function (s) {
      el.tips.textContent = '$' + s.tips;
      el.pizzas.textContent = s.delivered + '/' + s.total;
      var m = Math.floor(s.time / 60), sec = Math.floor(s.time % 60);
      el.time.textContent = m + ':' + (sec < 10 ? '0' : '') + sec;
      el.time.style.color = s.time < 30 ? '#ff5c5c' : '';
      el.target.textContent = s.targetName || '---';
      el.address.textContent = s.address || '---';
    },
    setCarry: function (list) {
      var html = '';
      for (var i = 0; i < list.length; i++) {
        var p = list[i];
        var pct = Math.round(p.heat * 100);
        var cls = 'pizza-slot' + (p.burning ? ' burning' : (p.heat < 0.3 ? ' cold' : ''));
        html += '<div class="' + cls + '">' +
          '<div class="addr">' + p.address + '</div>' +
          '<div class="bar"><div class="fill" style="width:' + pct + '%"></div></div>' +
          '</div>';
      }
      el.carry.innerHTML = html;
    },
    setPrompt: function (text) {
      el.prompt.innerHTML = text || '';
    },
    setVignette: function (v) {
      el.vignette.style.opacity = v;
    },
    update: function (dt, t) {
      drawMinimap(t);
      // compass toward the current target
      var tgt = GC.annoyances.gpsFake || GC.game.currentTarget;
      if (el.compassArrow) {
        if (tgt) {
          var p = GC.player.state.pos;
          var worldAngle = Math.atan2(tgt.x - p.x, tgt.z - p.z);
          var camAngle = GC.player.camYaw + Math.PI;
          var rel = worldAngle - camAngle;
          while (rel > Math.PI) rel -= Math.PI * 2;
          while (rel < -Math.PI) rel += Math.PI * 2;
          el.compassArrow.style.transform = 'rotate(' + (rel * 180 / Math.PI).toFixed(1) + 'deg)';
          el.compassArrow.style.color = GC.annoyances.gpsFake ? '#ff5c5c' : '#ffe14d';
        } else {
          el.compassArrow.style.transform = 'rotate(0deg)';
        }
      }
      if (adActive) {
        adTimer -= dt;
        if (adTimer <= 0 && !adScanning) hideAd();
      }
    }
  };
})();
