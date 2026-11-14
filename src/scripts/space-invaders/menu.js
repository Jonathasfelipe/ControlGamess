(() => {
  'use strict';
const canvas = document.getElementById('bgCanvas');
    const ctx = canvas.getContext('2d');
    const assets = { 
      playerFighterBlue: '../../assets/images/space-invaders/ships/SpaceInvaders-ship-fighter-exo-blue-preview.png',
      playerFighterGreen: '../../assets/images/space-invaders/ships/SpaceInvaders-ship-fighter-exo-green-preview.png',
      playerTankCrimson: '../../assets/images/space-invaders/ships/SpaceInvaders-ship-tank-crimson-preview.png',
      playerGuardCyan: '../../assets/images/space-invaders/ships/SpaceInvaders-ship-guard-cyan-barrier-preview.png',
      playerTankAmber: '../../assets/images/space-invaders/ships/SpaceInvaders-ship-tank-amber-preview.png',
      playerGuardBlue: '../../assets/images/space-invaders/ships/SpaceInvaders-ship-guard-blue-barrier-preview.png',
      scout: '../../assets/images/space-invaders/ships/SpaceInvaders-sprite-scout.png',
      interceptor: '../../assets/images/space-invaders/ships/SpaceInvaders-sprite-interceptor.png',
      tank: '../../assets/images/space-invaders/ships/SpaceInvaders-sprite-tank.png',
      bomber: '../../assets/images/space-invaders/ships/SpaceInvaders-sprite-bomber.png'
    };
    const images = {};
    const stars = [];
    const ships = [];
    let animationFrame = 0;
    
    function init() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;

      for (let i = 0; i < 150; i++) {
        stars.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          s: Math.random() * 2,
          v: 0.2 + Math.random() * 0.8
        });
      }

      const shipTypes = Object.keys(assets);
      for (let i = 0; i < shipTypes.length; i++) {
        ships.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height - canvas.height,
          type: shipTypes[i % shipTypes.length],
          v: 1.2 + Math.random() * 2.5,
          size: 40 + Math.random() * 25
        });
      }

      const assetEntries = Object.entries(assets);
      for (const [key, src] of assetEntries) {
        const img = new Image();
        img.onload = startAnimation;
        img.onerror = startAnimation;
        img.src = src;
        images[key] = img;
      }
      startAnimation();
    }

    function drawStars() {
      ctx.fillStyle = '#fff';
      stars.forEach(s => {
        ctx.globalAlpha = 0.3 + Math.random() * 0.5;
        ctx.fillRect(s.x, s.y, s.s, s.s);
        s.y += s.v;
        if (s.y > canvas.height) s.y = 0;
      });
      ctx.globalAlpha = 1.0;
    }

    function drawShips() {
      ships.forEach(s => {
        const img = images[s.type];
        if (img?.complete && img.naturalWidth > 0) {
          ctx.save();
          ctx.translate(s.x, s.y);
          const isProtagonist = s.type.startsWith('player');
          if (isProtagonist) {
             ctx.rotate(0);
          } else {
             ctx.rotate(Math.PI);
          }
          ctx.globalAlpha = isProtagonist ? 1.0 : 0.6;
          ctx.drawImage(img, -s.size / 2, -s.size / 2, s.size, s.size);
          ctx.restore();
        }
        s.y += s.v;
        if (s.y > canvas.height + 100) {
          s.y = -100;
          s.x = Math.random() * canvas.width;
        }
      });
      ctx.globalAlpha = 1.0;
    }
    
    function animate() {
      animationFrame = 0;
      if (document.hidden || document.body.classList.contains('playing')) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      drawStars();
      drawShips();
      animationFrame = requestAnimationFrame(animate);
    }

    function startAnimation() {
      if (!document.hidden && !document.body.classList.contains('playing') && !animationFrame) {
        animationFrame = requestAnimationFrame(animate);
      }
    }

    function stopAnimation() {
      if (animationFrame) cancelAnimationFrame(animationFrame);
      animationFrame = 0;
    }

    document.addEventListener('visibilitychange', () => {
      if (document.hidden || document.body.classList.contains('playing')) stopAnimation();
      else startAnimation();
    });
    
    window.addEventListener('resize', () => { 
      canvas.width = window.innerWidth; 
      canvas.height = window.innerHeight; 
    });
    const startMenu = document.getElementById('startMenu');
    const gameView = document.getElementById('gameView');
    document.getElementById('startGame').addEventListener('click', () => {
      stopAnimation();
      document.body.classList.add('playing');
      startMenu.hidden = true;
      gameView.hidden = false;
      document.dispatchEvent(new CustomEvent('space-invaders:start'));
    });
    document.addEventListener('space-invaders:return-home', () => {
      document.body.classList.remove('playing');
      gameView.hidden = true;
      startMenu.hidden = false;
      startAnimation();
    });
    window.addEventListener('load', () => document.getElementById('loading').classList.add('done'), { once: true });
    try { init(); } catch (error) { console.error('Falha ao preparar o fundo animado do menu:', error); }
})();
