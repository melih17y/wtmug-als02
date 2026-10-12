/* app.js – PWA Donanım Test Aracı ana mantık */
(() => {
  'use strict';

  /* ---------- Service Worker kaydı ---------- */
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./service-worker.js').then(reg => {
      setSwStatus('aktif');
      reg.addEventListener('updatefound', () => setSwStatus('güncelleniyor'));
    }).catch(err => {
      console.error('SW kayıt hatası:', err);
      setSwStatus('hata');
    });
  }
  function setSwStatus(txt){
    const b = document.getElementById('sw-status');
    const n = document.getElementById('net-sw');
    if (b){ b.textContent = 'SW: ' + txt; b.classList.toggle('on', txt==='aktif'); }
    if (n) n.textContent = txt;
  }

  /* ---------- Basit router ---------- */
  const views = ['color','touch','speaker','mic','vibrate','net'];
  const menu = document.getElementById('menu');

  function openView(name){
    views.forEach(v => {
      const el = document.getElementById('view-' + v);
      if (el) el.hidden = (v !== name);
    });
    menu.hidden = true;
    // Modül başlatma
    if (name === 'color') ColorTest.open();
    if (name === 'touch') TouchTest.open();
    if (name === 'speaker') SpeakerTest.open();
    if (name === 'mic') MicTest.open();
    if (name === 'vibrate') VibrateTest.open();
    if (name === 'net') NetTest.open();
  }
  function backToMenu(){
    ColorTest.close(); TouchTest.close(); SpeakerTest.close();
    MicTest.close(); VibrateTest.close(); NetTest.close();
    views.forEach(v => { const el=document.getElementById('view-'+v); if(el) el.hidden = true; });
    menu.hidden = false;
  }

  menu.addEventListener('click', e => {
    const btn = e.target.closest('.tile');
    if (btn) openView(btn.dataset.view);
  });
  document.querySelectorAll('[data-back]').forEach(b => b.addEventListener('click', backToMenu));

  /* ================= RENK TESTİ ================= */
  const ColorTest = (() => {
    const colors = ['#ff0000','#00ff00','#0000ff','#ffffff','#000000','#808080','#ff00ff','#00ffff','#ffff00'];
    let idx = 0;
    const full = document.getElementById('color-full');
    const hex  = document.getElementById('color-hex');
    const exit = document.getElementById('color-exit');

    function paint(){
      const c = colors[idx];
      full.style.background = c;
      hex.textContent = c.toUpperCase();
      // Beyaz zeminde okunurluk
      const light = ['#ffffff','#00ffff','#ffff00','#00ff00'].includes(c);
      full.querySelector('.color-info').style.color = light ? '#000' : '#fff';
    }
    function next(){ idx = (idx + 1) % colors.length; paint(); }
    function open(){
      idx = 0; paint();
      full.hidden = false;
      full.addEventListener('click', next);
      exit.addEventListener('click', e => { e.stopPropagation(); close(); });
      // Fullscreen dene (kullanıcı etkileşimi gerektirir, sessizce geç)
      const el = document.documentElement;
      if (el.requestFullscreen) el.requestFullscreen().catch(()=>{});
    }
    function close(){
      full.hidden = true;
      full.removeEventListener('click', next);
      if (document.fullscreenElement) document.exitFullscreen().catch(()=>{});
    }
    return { open, close };
  })();

  /* ================= DOKUNMATİK TESTİ ================= */
  const TouchTest = (() => {
    const canvas = document.getElementById('touch-canvas');
    const ctx = canvas.getContext('2d');
    const activeEl = document.getElementById('touch-active');
    const maxEl = document.getElementById('touch-max');
    const totalEl = document.getElementById('touch-total');
    const idsEl = document.getElementById('touch-ids');
    let touches = new Map(); // id -> {x,y}
    let maxTouches = 0, total = 0;

    const palette = ['#ef4444','#22c55e','#3b82f6','#eab308','#a855f7',
                     '#06b6d4','#f97316','#ec4899','#84cc16','#14b8a6'];
    function colorOf(id){ return palette[id % palette.length]; }

    function resize(){
      const r = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width  = r.width  * dpr;
      canvas.height = r.height * dpr;
      ctx.setTransform(dpr,0,0,dpr,0,0);
      redraw();
    }
    function redraw(){
      const w = canvas.clientWidth, h = canvas.clientHeight;
      ctx.clearRect(0,0,w,h);
      ctx.fillStyle = '#05080c';
      ctx.fillRect(0,0,w,h);
      touches.forEach((p,id) => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 45, 0, Math.PI*2);
        ctx.fillStyle = colorOf(id) + '55';
        ctx.fill();
        ctx.beginPath();
        ctx.arc(p.x, p.y, 12, 0, Math.PI*2);
        ctx.fillStyle = colorOf(id);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.font = '12px monospace';
        ctx.fillText('#'+id, p.x+16, p.y+4);
      });
      activeEl.textContent = touches.size;
      maxEl.textContent = maxTouches;
      totalEl.textContent = total;
      idsEl.textContent = [...touches.keys()].map(id=>'#'+id).join(' ');
    }
    function pos(t){
      const r = canvas.getBoundingClientRect();
      return { x: t.clientX - r.left, y: t.clientY - r.top };
    }
    function onStart(e){
      e.preventDefault();
      for (const t of e.changedTouches){
        touches.set(t.identifier, pos(t));
        total++;
      }
      maxTouches = Math.max(maxTouches, touches.size);
      redraw();
    }
    function onMove(e){
      e.preventDefault();
      for (const t of e.changedTouches){
        if (touches.has(t.identifier)) touches.set(t.identifier, pos(t));
      }
      redraw();
    }
    function onEnd(e){
      e.preventDefault();
      for (const t of e.changedTouches) touches.delete(t.identifier);
      redraw();
    }
    function clear(){
      touches.clear(); maxTouches = 0; total = 0; redraw();
    }
    function open(){
      resize();
      canvas.addEventListener('touchstart', onStart, {passive:false});
      canvas.addEventListener('touchmove',  onMove,  {passive:false});
      canvas.addEventListener('touchend',   onEnd,   {passive:false});
      canvas.addEventListener('touchcancel',onEnd,   {passive:false});
      window.addEventListener('resize', resize);
      document.getElementById('touch-clear').addEventListener('click', clear);
      clear();
    }
    function close(){
      canvas.removeEventListener('touchstart', onStart);
      canvas.removeEventListener('touchmove',  onMove);
      canvas.removeEventListener('touchend',   onEnd);
      canvas.removeEventListener('touchcancel',onEnd);
      window.removeEventListener('resize', resize);
      document.getElementById('touch-clear').removeEventListener('click', clear);
      touches.clear(); maxTouches = 0; total = 0;
    }
    return { open, close };
  })();

  /* ================= HOPARLÖR TESTİ ================= */
  const SpeakerTest = (() => {
    let ctx = null, osc = null, gain = null, panner = null, sweepTimer = null;
    const status = document.getElementById('speaker-status');

    function ensureCtx(){
      if (!ctx){
        ctx = new (window.AudioContext || window.webkitAudioContext)();
      }
      if (ctx.state === 'suspended') ctx.resume();
    }
    function stop(){
      if (sweepTimer){ clearInterval(sweepTimer); sweepTimer = null; }
      if (osc){ try{ osc.stop(); }catch(_){} osc.disconnect(); osc = null; }
      if (gain){ gain.disconnect(); gain = null; }
      if (panner){ panner.disconnect(); panner = null; }
      status.textContent = 'durduruldu';
    }
    function playTone({pan=0, freq=440, dur=2, sweep=false}){
      ensureCtx();
      stop();
      osc = ctx.createOscillator();
      gain = ctx.createGain();
      panner = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.value = 0.15;
      osc.connect(gain);
      if (panner){ panner.pan.value = pan; gain.connect(panner); panner.connect(ctx.destination); }
      else gain.connect(ctx.destination);
      osc.start();

      if (sweep){
        let f = 20;
        const step = 100;
        osc.frequency.value = f;
        status.textContent = 'sweep: 20 Hz';
        sweepTimer = setInterval(() => {
          f *= 1.08;
          if (f > 20000){ stop(); return; }
          osc.frequency.value = f;
          status.textContent = 'sweep: ' + Math.round(f) + ' Hz';
        }, step);
      } else {
        status.textContent = `çalıyor – pan=${pan}, ${freq} Hz`;
        setTimeout(() => { if (osc) stop(); }, dur*1000);
      }
    }
    function open(){
      document.querySelectorAll('[data-tone]').forEach(b => {
        b.addEventListener('click', () => {
          const t = b.dataset.tone;
          if (t === 'left')  playTone({pan:-1, freq:440});
          if (t === 'right') playTone({pan: 1, freq:440});
          if (t === 'both')  playTone({pan: 0, freq:440});
          if (t === 'sweep') playTone({sweep:true});
        });
      });
      document.getElementById('speaker-stop').addEventListener('click', stop);
    }
    function close(){ stop(); }
    return { open, close };
  })();

  /* ================= MİKROFON TESTİ ================= */
  const MicTest = (() => {
    let stream = null, audioCtx = null, analyser = null, dataArr = null, rafId = null;
    let recorder = null, chunks = [];
    const bar = document.getElementById('mic-bar');
    const dbEl = document.getElementById('mic-db');
    const status = document.getElementById('mic-status');
    const playback = document.getElementById('mic-playback');

    async function start(){
      try{
        stream = await navigator.mediaDevices.getUserMedia({ audio:true });
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const src = audioCtx.createMediaStreamSource(stream);
        analyser = audioCtx.createAnalyser();
        analyser.fftSize = 1024;
        dataArr = new Uint8Array(analyser.frequencyBinCount);
        src.connect(analyser);
        status.textContent = 'mikrofon aktif';
        loop();
      }catch(err){
        status.textContent = 'Hata: ' + err.name + ' – izin verilmedi veya cihaz yok';
      }
    }
    function loop(){
      analyser.getByteTimeDomainData(dataArr);
      let sum = 0;
      for (let i=0;i<dataArr.length;i++){ const v=(dataArr[i]-128)/128; sum += v*v; }
      const rms = Math.sqrt(sum/dataArr.length);
      const pct = Math.min(100, rms*200);
      bar.style.width = pct + '%';
      const db = 20*Math.log10(rms || 1e-6);
      dbEl.textContent = 'RMS: ' + rms.toFixed(3) + '  |  dB: ' + db.toFixed(1);
      rafId = requestAnimationFrame(loop);
    }
    function stopMeter(){
      if (rafId) cancelAnimationFrame(rafId);
      rafId = null;
      bar.style.width = '0%';
      dbEl.textContent = '–';
    }
    async function stop(){
      stopMeter();
      if (recorder && recorder.state === 'recording') recorder.stop();
      if (stream){ stream.getTracks().forEach(t => t.stop()); stream = null; }
      if (audioCtx){ try{ await audioCtx.close(); }catch(_){} audioCtx = null; }
      status.textContent = 'durduruldu';
    }
    function record(){
      if (!stream){ status.textContent = 'Önce mikrofonu başlatın'; return; }
      chunks = [];
      try{
        recorder = new MediaRecorder(stream);
      }catch(err){ status.textContent = 'MediaRecorder yok: ' + err.message; return; }
      recorder.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: chunks[0]?.type || 'audio/webm' });
        playback.src = URL.createObjectURL(blob);
        playback.hidden = false;
        status.textContent = 'kayıt hazır';
      };
      recorder.start();
      status.textContent = 'kaydediliyor (5 sn)…';
      setTimeout(() => { if (recorder && recorder.state==='recording') recorder.stop(); }, 5000);
    }
    function open(){
      document.getElementById('mic-start').addEventListener('click', start);
      document.getElementById('mic-stop').addEventListener('click', stop);
      document.getElementById('mic-record').addEventListener('click', record);
    }
    function close(){ stop(); playback.hidden = true; playback.src=''; }
    return { open, close };
  })();

  /* ================= TİTREŞİM TESTİ ================= */
  const VibrateTest = (() => {
    const status = document.getElementById('vib-status');
    function vibrate(val){
      if (!('vibrate' in navigator)){
        status.textContent = 'Bu cihaz/tarayıcı titreşimi desteklemiyor.';
        return;
      }
      let ok = false;
      if (val === '0'){ ok = navigator.vibrate(0); status.textContent = 'durduruldu'; return; }
      if (val === 'pattern'){ ok = navigator.vibrate([200,100,200,100,500]); status.textContent = 'desen gönderildi'; return; }
      ok = navigator.vibrate(parseInt(val,10));
      status.textContent = ok ? `titreşim: ${val} ms` : 'komut reddedildi';
    }
    function open(){
      document.querySelectorAll('[data-vib]').forEach(b => {
        b.addEventListener('click', () => vibrate(b.dataset.vib));
      });
      status.textContent = ('vibrate' in navigator) ? 'destekleniyor' : 'desteklenmiyor';
    }
    function close(){ if ('vibrate' in navigator) navigator.vibrate(0); }
    return { open, close };
  })();

  /* ================= İNTERNET TESTİ ================= */
  const NetTest = (() => {
    const onEl = document.getElementById('net-online');
    const typeEl = document.getElementById('net-type');
    const downEl = document.getElementById('net-down');
    const rttEl = document.getElementById('net-rtt');
    const pingEl = document.getElementById('net-ping');

    function updateOnline(){
      onEl.textContent = navigator.onLine ? 'çevrimiçi' : 'çevrimdışı';
      onEl.style.color = navigator.onLine ? '#22c55e' : '#ef4444';
    }
    function updateConn(){
      const c = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
      if (!c){ typeEl.textContent = '–'; downEl.textContent='–'; rttEl.textContent='–'; return; }
      typeEl.textContent = c.effectiveType || '–';
      downEl.textContent = c.downlink != null ? c.downlink + ' Mb/s' : '–';
      rttEl.textContent  = c.rtt != null ? c.rtt + ' ms' : '–';
    }
    async function ping(){
      pingEl.textContent = 'ölçülüyor…';
      const t0 = performance.now();
      try{
        await fetch('https://www.google.com/generate_204', {
          mode:'no-cors', cache:'no-store', method:'GET'
        });
        const ms = Math.round(performance.now() - t0);
        pingEl.textContent = ms + ' ms';
      }catch(err){
        pingEl.textContent = 'başarısız (' + err.message + ')';
      }
    }
    function open(){
      updateOnline(); updateConn();
      window.addEventListener('online',  updateOnline);
      window.addEventListener('offline', updateOnline);
      const c = navigator.connection;
      if (c) c.addEventListener('change', updateConn);
      document.getElementById('net-test').addEventListener('click', ping);
    }
    function close(){
      window.removeEventListener('online',  updateOnline);
      window.removeEventListener('offline', updateOnline);
      const c = navigator.connection;
      if (c) c.removeEventListener('change', updateConn);
      document.getElementById('net-test').removeEventListener('click', ping);
    }
    return { open, close };
  })();

})();