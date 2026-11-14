(() => {
  'use strict';

  // Pixel art and player orientation only; the game loop owns the background.
  const spriteAsset = /SpaceInvaders-sprite-[\w-]+\.png/i;
  const playerAsset = /SpaceInvaders-sprite-[\w-]*(player|protagonist|pilot|hero|wingman|ally)[\w-]*\.png/i;
  const originalDrawImage = CanvasRenderingContext2D.prototype.drawImage;
  const heldDirections = new Set();
  const keyDirections = {
    ArrowLeft: [-1, 0], a: [-1, 0], A: [-1, 0],
    ArrowRight: [1, 0], d: [1, 0], D: [1, 0],
    ArrowUp: [0, -1], w: [0, -1], W: [0, -1],
    ArrowDown: [0, 1], s: [0, 1], S: [0, 1]
  };
  window.addEventListener('keydown', event => { if (keyDirections[event.key]) heldDirections.add(event.key); });
  window.addEventListener('keyup', event => heldDirections.delete(event.key));
  window.addEventListener('blur', () => heldDirections.clear());

  function movementAngle() {
    let dx = 0, dy = 0;
    for (const key of heldDirections) {
      const dir = keyDirections[key];
      if (dir) { dx += dir[0]; dy += dir[1]; }
    }
    if (!dx && !dy) return 0;
    return Math.atan2(dy, dx) + Math.PI / 2;
  }

  function drawTurnedSprite(ctx, image, args, angle) {
    let sx, sy, sw, sh, dx, dy, dw, dh, cropped = false;
    if (args.length === 2) {
      [dx, dy] = args;
      dw = image.naturalWidth || image.width || 0;
      dh = image.naturalHeight || image.height || 0;
    } else if (args.length === 4) {
      [dx, dy, dw, dh] = args;
    } else if (args.length === 8) {
      [sx, sy, sw, sh, dx, dy, dw, dh] = args;
      cropped = true;
    } else return originalDrawImage.call(ctx, image, ...args);

    ctx.save();
    try {
      ctx.translate(dx + dw / 2, dy + dh / 2);
      ctx.rotate(angle);
      if (cropped) originalDrawImage.call(ctx, image, sx, sy, sw, sh, -dw / 2, -dh / 2, dw, dh);
      else originalDrawImage.call(ctx, image, -dw / 2, -dh / 2, dw, dh);
    } finally {
      ctx.restore();
    }
  }

  CanvasRenderingContext2D.prototype.drawImage = function (image, ...args) {
    const src = String(image?.currentSrc || image?.src || image?.href || '');
    const previousSmoothing = this.imageSmoothingEnabled;
    if (spriteAsset.test(src)) this.imageSmoothingEnabled = false;
    try {
      if (playerAsset.test(src)) return drawTurnedSprite(this, image, args, movementAngle());
      return originalDrawImage.call(this, image, ...args);
    } finally {
      this.imageSmoothingEnabled = previousSmoothing;
    }
  };

  // The standalone menu may be opened from file://, where the parent page cannot
  // inspect an iframe's document. Publish the game's loaded PNG URLs by postMessage.
  function publishSpriteAssets() {
    const loaded = performance.getEntriesByType('resource')
      .map(entry => entry.name).filter(url => /\.png(?:\?|$)/i.test(url));
    const declared = [...document.documentElement.outerHTML.matchAll(/(?:src|href)="([^"]*SpaceInvaders-[\w-]+\.png(?:\?[^"]*)?)"/gi)]
      .map(match => new URL(match[1], location.href).href);
    const urls = [...new Set([...loaded, ...declared])];
    window.parent.postMessage({ type: 'space-invaders-assets', urls }, '*');
  }
  window.addEventListener('load', publishSpriteAssets, { once: true });
  setTimeout(publishSpriteAssets, 250);
  setTimeout(publishSpriteAssets, 1000);
})();
