/* La Linea — Gioco Tributo (B/N) — MIT 2025 pezzaliAPP */
(() => {
  'use strict';

  const cvs = document.getElementById('game');
  const ctx = cvs.getContext('2d');
  const W = cvs.width, H = cvs.height;

  // Colori (B/N)
  const FG = '#ffffff';
  const SHADOW = 'rgba(255,255,255,.08)';

  // Stato di gioco
  let running = true;
  let t = 0;                // tempo
  let score = 0;
  let baseY = Math.round(H * 0.72);
  let speed = 4;            // velocità scorrimento linea
  let obst = [];            // ostacoli (scalini, buchi, gobbe)
  let particles = [];       // polvere bianca della traccia
  let hand = {x: W+120, y: baseY-160, show: false, timer: 0};

  // Personaggio (stilizzato a “contorno”)
  const guy = {
    x: Math.round(W*0.28),
    y: baseY,
    vy: 0,
    onGround: true,
    jump() {
      if (!running) return;
      if (this.onGround) {
        this.vy = -16;
        this.onGround = false;
      }
    },
    update() {
      this.vy += 0.8;           // gravità
      this.y += this.vy;
      if (this.y > baseY) {
        this.y = baseY;
        this.vy = 0;
        this.onGround = true;
      }
    },
    draw() {
      ctx.lineWidth = 6;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.strokeStyle = FG;

      const x = this.x, y = this.y;
      // corpo (profilo a linea continua)
      ctx.beginPath();
      ctx.moveTo(x-12, y);
      ctx.lineTo(x-12, y-90);   // fianco sx
      ctx.quadraticCurveTo(x-8, y-120, x+20, y-120); // testa sopra
      ctx.quadraticCurveTo(x+18, y-100, x+12, y-96); // naso
      ctx.quadraticCurveTo(x+30, y-94, x+42, y-70);  // spalla dx
      ctx.lineTo(x+38, y-40);                         // braccio
      // mano dx (aperta)
      ctx.moveTo(x+38, y-40);
      ctx.quadraticCurveTo(x+64, y-46, x+70, y-52);
      ctx.moveTo(x+38, y-40);
      ctx.quadraticCurveTo(x+64, y-30, x+70, y-26);

      // ritorno al fianco dx
      ctx.moveTo(x+22, y-40);
      ctx.lineTo(x+22, y);      // fianco dx
      ctx.stroke();

      // piccola bocca
      ctx.beginPath();
      ctx.moveTo(x+10, y-98);
      ctx.lineTo(x+26, y-96);
      ctx.stroke();
    }
  };

  // Generatore ostacoli “alla Linea”
  function spawnObstacle() {
    const r = Math.random();
    if (r < 0.5) {
      // scalino (su o giù)
      const dir = Math.random() < 0.5 ? -1 : 1;
      const step = 35 + Math.random()*25;
      obst.push({type:'step', x: W+40, w: 80, h: dir*step});
    } else if (r < 0.8) {
      // gobba
      const h = 30 + Math.random()*40;
      obst.push({type:'bump', x: W+40, w: 120, h});
    } else {
      // buco (interruzione linea)
      const w = 90 + Math.random()*90;
      obst.push({type:'gap', x: W+40, w});
    }
  }

  // Collisioni rispetto alla baseline deformata
  function collide(o, x) {
    if (o.type === 'gap') {
      // se il personaggio è “sul buco” ed è a terra, cade (game over)
      const inGap = (x > o.x && x < o.x + o.w);
      return inGap && guy.onGround;
    }
    if (o.type === 'step') {
      const inStep = (x > o.x && x < o.x + o.w);
      if (!inStep) return false;
      const local = (x - o.x) / o.w; // 0..1
      const yOffset = o.h * (local < 0.5 ? (local*2) : (1 - (local-0.5)*2));
      return guy.y > baseY + yOffset - 8;
    }
    if (o.type === 'bump') {
      const inB = (x > o.x && x < o.x + o.w);
      if (!inB) return false;
      const local = (x - o.x) / o.w; // 0..1
      const yOffset = -o.h * Math.sin(local*Math.PI);
      return guy.y > baseY + yOffset - 8;
    }
    return false;
  }

  // Disegno baseline, ostacoli e mano “che disegna”
  function drawWorld() {
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.strokeStyle = FG;

    let x = 0;
    ctx.beginPath();
    ctx.moveTo(0, baseY);

    // Segmenti fino a ciascun ostacolo
    let lastX = 0;
    for (const o of obst) {
      if (o.x > W) continue;
      // tratto piatto fino all'inizio
      ctx.lineTo(o.x, baseY);

      if (o.type === 'gap') {
        // stacco
        ctx.moveTo(o.x + o.w, baseY);
      } else if (o.type === 'step') {
        const mid = o.x + o.w/2;
        ctx.lineTo(mid, baseY + o.h);
        ctx.lineTo(o.x + o.w, baseY);
      } else if (o.type === 'bump') {
        const s = 16;
        for (let i=0;i<=o.w;i+=s){
          const px = o.x + i;
          const py = baseY - o.h*Math.sin((i/o.w)*Math.PI);
          if (i===0) ctx.lineTo(px, py); else ctx.lineTo(px, py);
        }
      }
      lastX = o.x + o.w;
    }
    ctx.lineTo(W, baseY);
    ctx.stroke();

    // mano
    if (hand.show) {
      ctx.fillStyle = FG;
      ctx.beginPath();
      ctx.arc(hand.x, hand.y, 14, 0, Math.PI*2);
      ctx.fill();
      ctx.fillRect(hand.x-2, hand.y, 4, 60); // “matita”
    }

    // polvere
    particles.forEach(p=>{
      ctx.globalAlpha = p.a;
      ctx.fillStyle = FG;
      ctx.fillRect(p.x, p.y, 3, 3);
      ctx.globalAlpha = 1;
    });
    particles = particles.filter(p => (p.a -= 0.02) > 0);
  }

  // Loop
  function step() {
    if (running) {
      t++;
      score += 1;

      // difficoltà progressiva
      if (t % 600 === 0) speed += 0.3;

      // aggiorna ostacoli
      if (t % 70 === 0) spawnObstacle();
      obst.forEach(o => o.x -= speed);
      obst = obst.filter(o => o.x + o.w > -20);

      // mano: appare ogni tanto
      if (hand.timer-- <= 0) {
        hand.show = Math.random() < 0.02;
        hand.timer = 180 + (Math.random()*240|0);
        if (hand.show) {
          hand.x = W - 40;
          hand.y = baseY - (120 + Math.random()*80);
        }
      } else if (hand.show) {
        hand.x -= speed*0.8;
      }

      // personaggio
      guy.update();

      // collisioni
      for (const o of obst) {
        if (collide(o, guy.x)) {
          running = false; // game over
          break;
        }
      }

      // particelle sulla linea
      if (t % 2 === 0) particles.push({x:guy.x-18+Math.random()*8, y:baseY-2+Math.random()*4, a:0.5});
    }

    // draw
    ctx.clearRect(0,0,W,H);
    // leggero bagliore
    ctx.fillStyle = SHADOW;
    ctx.fillRect(0, baseY-3, W, 6);

    drawWorld();
    guy.draw();

    // HUD overlay
    ctx.fillStyle = FG;
    ctx.font = '20px ui-monospace, Menlo, Consolas, monospace';
    ctx.fillText(`PUNTI ${score}`, 18, 30);

    if (!running) {
      ctx.textAlign = 'center';
      ctx.font = 'bold 44px ui-monospace, Menlo, Consolas, monospace';
      ctx.fillText('GAME OVER', W/2, H/2 - 10);
      ctx.font = '20px ui-monospace, Menlo, Consolas, monospace';
      ctx.fillText('Premi SPAZIO o tocca per ripartire', W/2, H/2 + 24);
      ctx.textAlign = 'start';
    }

    document.getElementById('score').textContent = score.toString();
    requestAnimationFrame(step);
  }

  // Input
  function onPress() {
    if (!running) return restart();
    guy.jump();
  }
  function restart() {
    running = true;
    t = 0; score = 0; speed = 4;
    obst.length = 0; particles.length = 0;
    guy.y = baseY; guy.vy = 0; guy.onGround = true;
  }

  window.addEventListener('keydown', e => {
    if (e.code === 'Space') { e.preventDefault(); onPress(); }
    if (e.code === 'KeyR') restart();
    if (e.code === 'KeyP') togglePause();
  });

  document.getElementById('btnJump').addEventListener('click', onPress);
  document.getElementById('btnRestart').addEventListener('click', restart);
  document.getElementById('btnPause').addEventListener('click', togglePause);
  document.getElementById('touch').addEventListener('pointerdown', onPress);

  function togglePause(){
    running = !running;
    document.getElementById('btnPause').textContent = running ? '⏸︎ Pausa' : '▶︎ Riprendi';
  }

  // start
  requestAnimationFrame(step);
})();
