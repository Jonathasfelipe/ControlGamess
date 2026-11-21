(() => {
  'use strict';

  const blockedBackground = /nebula|star[_ -]?forming|black[_ -]?hole|planet[_ -]?explosion/i;
  const spriteAsset = /SpaceInvaders-sprite-[\w-]+\.png/i;
  const playerAsset = /SpaceInvaders-sprite-[\w-]*(player|protagonist|pilot|hero|wingman|ally)[\w-]*\.png/i;
  const enemyAsset = /SpaceInvaders-sprite-[\w-]*(enemy|boss|scout|interceptor|tank|bomber|gunship|striker)[\w-]*\.png/i;
  const originalDrawImage = CanvasRenderingContext2D.prototype.drawImage;
  const warpStartedAt = performance.now();
  const heldDirections = new Set();
  const keyDirections = {
    ArrowLeft: [-1, 0], a: [-1, 0], A: [-1, 0],
    ArrowRight: [1, 0], d: [1, 0], D: [1, 0],
    ArrowUp: [0, -1], w: [0, -1], W: [0, -1],
    ArrowDown: [0, 1], s: [0, 1], S: [0, 1]
  };
  
  window.addEventListener('keydown', event => { if (keyDirections[event.key]) heldDirections.add(event.key); });
  window.addEventListener('keyup', event => heldDirections.delete(event.key));
  window.addEventListener('blur', () => { heldDirections.clear(); });

  const virtualJoy = { x: 0, y: 0, active: false };
  let gamepadX = 0;
  let gamepadY = 0;

  function pollGamepads() {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    gamepadX = 0;
    gamepadY = 0;
    for (const pad of pads) {
      if (!pad) continue;
      const ax = pad.axes[0];
      const ay = pad.axes[1];
      if (Math.abs(ax) > 0.2 || Math.abs(ay) > 0.2) {
        gamepadX = ax;
        gamepadY = ay;
        break;
      }
      if (pad.buttons[14]?.pressed) gamepadX = -1;
      if (pad.buttons[15]?.pressed) gamepadX = 1;
      if (pad.buttons[12]?.pressed) gamepadY = -1;
      if (pad.buttons[13]?.pressed) gamepadY = 1;
    }
  }

  function setupMobileControls() {
    if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
      const touchContainer = document.createElement('div');
      touchContainer.className = 'space-invaders-virtual-controls';
      touchContainer.innerHTML = '<div class="virtual-dpad" id="virtualDpad"><div class="dpad-knob" id="dpadKnob"></div></div>';
      const style = document.createElement('style');
      style.textContent = `.space-invaders-virtual-controls{position:fixed;bottom:20px;left:20px;width:130px;height:130px;background:rgba(255,255,255,0.08);border:2px solid rgba(255,255,255,0.2);border-radius:50%;z-index:99999;touch-action:none;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px)}.dpad-knob{width:50px;height:50px;background:rgba(0,255,130,0.5);border:2px solid #8fff82;border-radius:50%;position:absolute;transition:transform 0.05s linear}`;
      document.head.appendChild(style);
      document.body.appendChild(touchContainer);

      const dpad = document.getElementById('virtualDpad'), knob = document.getElementById('dpadKnob');
      const handleTouch = (clientX, clientY) => {
        const rect = dpad.getBoundingClientRect(), centerX = rect.left + rect.width / 2, centerY = rect.top + rect.height / 2;
        const dx = clientX - centerX, dy = clientY - centerY, dist = Math.hypot(dx, dy), maxRadius = rect.width / 2, angle = Math.atan2(dy, dx);
        const clampedDist = Math.min(dist, maxRadius);
        knob.style.transform = `translate(${Math.cos(angle) * clampedDist}px, ${Math.sin(angle) * clampedDist}px)`;
        virtualJoy.x = clampedDist > 0 ? (dx / dist) * (clampedDist / maxRadius) : 0;
        virtualJoy.y = clampedDist > 0 ? (dy / dist) * (clampedDist / maxRadius) : 0;
        virtualJoy.active = true;
      };
      dpad.addEventListener('pointerdown', e => { dpad.setPointerCapture(e.pointerId); handleTouch(e.clientX, e.clientY); });
      dpad.addEventListener('pointermove', e => { if (virtualJoy.active) handleTouch(e.clientX, e.clientY); });
      const endTouch = () => { virtualJoy.active = false; virtualJoy.x = 0; virtualJoy.y = 0; knob.style.transform = 'translate(0px, 0px)'; };
      dpad.addEventListener('pointerup', endTouch);
      dpad.addEventListener('pointercancel', endTouch);
    }
  }
  window.addEventListener('DOMContentLoaded', setupMobileControls);

  function getMovementVector() {
    pollGamepads();
    let dx = 0, dy = 0;
    for (const key of heldDirections) { dx += keyDirections[key][0]; dy += keyDirections[key][1]; }
    if (gamepadX !== 0 || gamepadY !== 0) { dx = gamepadX; dy = gamepadY; }
    else if (virtualJoy.active) { dx = virtualJoy.x; dy = virtualJoy.y; }
    return { dx, dy };
  }

  function movementAngle() {
    const { dx, dy } = getMovementVector();
    return (dx || dy) ? Math.atan2(dy, dx) + Math.PI / 2 : 0;
  }

  function drawTurnedSprite(ctx, image, args, angle, isPlayer = false, isEnemy = false) {
    let sx, sy, sw, sh, dx, dy, dw, dh, cropped = false;
    if (args.length === 2) { [dx, dy] = args; dw = image.naturalWidth || image.width; dh = image.naturalHeight || image.height; }
    else if (args.length === 4) { [dx, dy, dw, dh] = args; }
    else if (args.length === 8) { [sx, sy, sw, sh, dx, dy, dw, dh] = args; cropped = true; }
    else return originalDrawImage.call(ctx, image, ...args);
    
    ctx.save();
    try {
      ctx.translate(dx + dw / 2, dy + dh / 2);
      ctx.rotate(angle + (isPlayer ? getMovementVector().dx * 0.35 : (isEnemy ? Math.sin(performance.now() * 0.003 + dx) * 0.1 : 0)));
      if (cropped) originalDrawImage.call(ctx, image, sx, sy, sw, sh, -dw / 2, -dh / 2, dw, dh);
      else originalDrawImage.call(ctx, image, -dw / 2, -dh / 2, dw, dh);
    } finally { ctx.restore(); }
  }

  const activeExplosions = [];
  window.triggerVisualExplosion = function(x, y, scale = 1) {
    activeExplosions.push({
      x, y, radius: 5, maxRadius: 40 * scale, alpha: 1.0,
      sparks: Array.from({ length: 16 }, () => ({
        x, y, vx: (Math.random() - 0.5) * 10, vy: (Math.random() - 0.5) * 10, life: 1.0,
        color: Math.random() > 0.4 ? '#ffcc00' : '#ff2222'
      }))
    });
  };

  function renderExplosionEffects(ctx) {
    if (!activeExplosions.length) return;
    ctx.save();
    for (let i = activeExplosions.length - 1; i >= 0; i--) {
      const exp = activeExplosions[i];
      exp.radius += 3; exp.alpha -= 0.05;
      if (exp.alpha <= 0) { activeExplosions.splice(i, 1); continue; }
      ctx.beginPath();
      ctx.arc(exp.x, exp.y, exp.radius, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(255, 200, 50, ${exp.alpha})`;
      ctx.lineWidth = 2;
      ctx.stroke();
      for (const s of exp.sparks) {
        s.x += s.vx; s.y += s.vy; s.life -= 0.06;
        if (s.life > 0) { ctx.fillStyle = s.color; ctx.globalAlpha = s.life; ctx.fillRect(s.x, s.y, 4, 4); }
      }
    }
    ctx.restore();
  }

  function paintWarpStars(ctx) {
    const canvas = ctx.canvas;
    if (!canvas || !canvas.width) return;
    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#d9e1e9';
    const elapsed = performance.now() / 1000;
    for (let i = 0; i < 150; i++) {
      const rx = Math.abs(Math.sin((i + 11) * 127.1) * 43758) % 1;
      const ry = Math.abs(Math.sin((i + 11) * 311.7) * 24634) % 1;
      const x = rx * canvas.width;
      const y = (ry * canvas.height + elapsed * 500) % canvas.height;
      ctx.fillRect(x, y, 1, 3);
    }
    renderExplosionEffects(ctx);
    ctx.restore();
  }

  CanvasRenderingContext2D.prototype.drawImage = function (image, ...args) {
    const src = String(image?.currentSrc || image?.src || image?.href || '');
    if (blockedBackground.test(src)) { paintWarpStars(this); return; }
    const smoothing = this.imageSmoothingEnabled;
    if (spriteAsset.test(src)) this.imageSmoothingEnabled = false;
    try {
      if (playerAsset.test(src)) return drawTurnedSprite(this, image, args, movementAngle(), true, false);
      if (enemyAsset.test(src)) return drawTurnedSprite(this, image, args, 0, false, true);
      return originalDrawImage.call(this, image, ...args);
    } finally { this.imageSmoothingEnabled = smoothing; }
  };

  CanvasRenderingContext2D.prototype.fillRect = function (x, y, w, h) {
    originalFillRect.call(this, x, y, w, h);
    if (this.canvas && x <= 1 && y <= 1 && w >= this.canvas.width * 0.9) paintWarpStars(this);
  };

  const style = document.createElement('style');
  style.textContent = `canvas{filter:none!important}img[src*="nebula" i]{display:none!important}`;
  document.head.appendChild(style);

  function publishAssets() {
    const urls = [...new Set([...performance.getEntriesByType('resource').map(e => e.name), ...[...document.images].map(i => i.src)])];
    window.parent.postMessage({ type: 'space-invaders-assets', urls }, '*');
  }
  window.addEventListener('load', publishAssets);
})();
