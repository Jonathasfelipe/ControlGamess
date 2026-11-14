(() => {
  'use strict';

  const AUDIO_ROOT = new URL('../../assets/Space Invaders/audio/', document.baseURI);
  const EFFECTS = {
    blaster: { files: ['Blaster.mp4.mov'], volume: 0.18, voices: 1, minGap: 0 },
    laser: { files: ['laser.mp3.wav'], volume: 0.16, voices: 1, minGap: 0 },
    explosion: { files: ['Boss explodindo.mp3.wav'], volume: 0.4, voices: 2, minGap: 100 },
    enemyDeath: { files: ['inimigos_aleatórios_morrendo.mp3.wav'], volume: 0.34, voices: 3, minGap: 65 },
    // Não há asset planet_explosion na pasta atual; reutiliza o efeito de explosão disponível.
    planetExplosion: { files: ['Boss explodindo.mp3.wav'], volume: 0.42, voices: 2, minGap: 180 },
    bossArrival: { files: ['Boss aparecendo.mp3.aiff'], volume: 0.48, voices: 1, minGap: 700 },
    bossExplosion: { files: ['Boss explodindo.mp3.wav'], volume: 0.42, voices: 1, minGap: 250 },
    bossVictory: { files: ['wins.mp3.wav'], volume: 0.42, voices: 1, minGap: 500 },
    playerDeath: { files: ['Protagonista_morrendo.mp3.wav'], volume: 0.38, voices: 1, minGap: 300 },
    menuClick: { files: ['menu.mp3.ogg'], volume: 0.28, voices: 2, minGap: 60 },
    upgrade: { files: ['upgrades.mp3.wav'], volume: 0.36, voices: 2, minGap: 90 },
    specialFighter: { files: ['laser.mp3.wav'], volume: 0.25, voices: 1, minGap: 140 },
    specialGuard: { files: ['especial_exoguard.mp3.wav'], volume: 0.38, voices: 1, minGap: 140 },
    specialTank: { files: ['especial_exotank.mp3.mp3'], volume: 0.38, voices: 1, minGap: 140 }
  };

  // Edit start/duration in seconds if an effect later shares a track with other sounds.
  const audioMap = {
    upgrade: { file: 'upgrades.mp3.wav', start: 0, duration: null },
    specialGuard: { file: 'especial_exoguard.mp3.wav', start: 0, duration: null },
    specialTank: { file: 'especial_exotank.mp3.mp3', start: 0, duration: null }
  };

  const MIME_TYPES = {
    mp3: 'audio/mpeg', mp4: 'audio/mp4', m4a: 'audio/mp4', aac: 'audio/aac',
    wav: 'audio/wav', ogg: 'audio/ogg', aif: 'audio/aiff', aiff: 'audio/aiff',
    flac: 'audio/flac', mov: 'video/quicktime'
  };
  const reportByUrl = new Map();
  const playbackWarnings = new Set();
  const playbackSuccesses = new Set();
  const effects = new Map();
  const decodedBuffers = new Map();
  const activeBufferSources = new Map();
  const sourceGeneration = new Map();
  const audioPlayTokens = new WeakMap();
  let audioContext = null;
  let unlocked = false;
  let musicRequested = false;

  console.log('[Áudio] Diretório configurado:', AUDIO_ROOT.href);

  function reportLoad(url, status, audio) {
    if (reportByUrl.get(url) === status) return;
    reportByUrl.set(url, status);
    if (status === 'loaded') {
      console.log(`[Áudio] Arquivo reconhecido pelo navegador: ${url}`);
      return;
    }
    const error = audio.error;
    console.warn(`[Áudio] Falha ao carregar: ${url}`, {
      code: error?.code ?? 'desconhecido',
      message: error?.message || 'O navegador não conseguiu decodificar o contêiner/codec.'
    });
  }

  function createAudio(file, volume) {
    const audio = new Audio();
    const url = new URL(file, AUDIO_ROOT);
    const extension = file.split('.').pop().toLowerCase();
    const mime = MIME_TYPES[extension];
    audio.preload = 'metadata';
    audio.volume = volume;
    if (mime && audio.canPlayType(mime) === '') {
      console.warn(`[Áudio] O navegador não declara suporte a ${mime}; tentando carregar mesmo assim: ${url.href}`);
    }
    audio.addEventListener('loadedmetadata', () => reportLoad(url.href, 'loaded', audio), { once: true });
    audio.addEventListener('error', () => reportLoad(url.href, 'failed', audio), { once: true });
    audio.addEventListener('playing', () => {
      if (playbackSuccesses.has(url.href)) return;
      playbackSuccesses.add(url.href);
      console.log(`[Áudio] Reprodução iniciada: ${url.href}`);
    });
    audio.src = url.href;
    return audio;
  }

  function createEffect(name, definition) {
    const voicePools = new Map();
    for (const file of definition.files) {
      voicePools.set(file, {
        voices: Array.from({ length: definition.voices }, () => createAudio(file, definition.volume)),
        nextVoice: 0
      });
    }
    effects.set(name, { ...definition, voicePools, lastPlayedAt: -Infinity });
  }

  const music = createAudio('background_music.flac', 0.34);
  music.loop = true;
  for (const [name, definition] of Object.entries(EFFECTS)) createEffect(name, definition);

  function getAudioContext() {
    if (audioContext) return audioContext;
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return null;
    try {
      audioContext = new AudioContextClass();
      return audioContext;
    } catch (error) {
      console.warn('[Áudio] Web Audio API indisponível; usando elementos HTMLAudio.', error);
      return null;
    }
  }

  function loadDecodedBuffer(file, context) {
    const url = new URL(file, AUDIO_ROOT).href;
    if (!decodedBuffers.has(url)) {
      const request = fetch(url)
        .then(response => {
          if (!response.ok) throw new Error(`HTTP ${response.status} ao carregar ${url}`);
          return response.arrayBuffer();
        })
        .then(data => context.decodeAudioData(data))
        .then(buffer => {
          console.log(`[Áudio] Buffer decodificado: ${url}`);
          return buffer;
        })
        .catch(error => {
          if (!playbackWarnings.has(url)) {
            playbackWarnings.add(url);
            console.warn(`[Áudio] Falha ao carregar/decodificar buffer: ${url}`, error);
          }
          throw error;
        });
      decodedBuffers.set(url, request);
    }
    return decodedBuffers.get(url);
  }

  function unlock() {
    unlocked = true;
    const context = getAudioContext();
    if (!context) return;
    if (context.state === 'suspended') context.resume().catch(error => {
      console.warn('[Áudio] Não foi possível liberar o AudioContext.', error);
    });
    for (const clip of Object.values(audioMap)) loadDecodedBuffer(clip.file, context).catch(() => {});
  }

  function stopAudioElement(audio) {
    audioPlayTokens.set(audio, (audioPlayTokens.get(audio) || 0) + 1);
    audio.pause();
    try { audio.currentTime = 0; } catch {}
  }

  function playAudio(audio, url, label, onFailure = () => {}) {
    try {
      stopAudioElement(audio);
      const playToken = (audioPlayTokens.get(audio) || 0) + 1;
      audioPlayTokens.set(audio, playToken);
      const playback = audio.play();
      playback?.then(() => {
        if (audioPlayTokens.get(audio) !== playToken) stopAudioElement(audio);
      });
      playback?.catch(error => {
        onFailure();
        if (error?.name === 'AbortError' || error?.name === 'NotAllowedError' || playbackWarnings.has(url)) return;
        playbackWarnings.add(url);
        console.warn(`[Áudio] Falha ao reproduzir ${label}: ${url}`, error);
      });
    } catch (error) {
      onFailure();
      if (playbackWarnings.has(url)) return;
      playbackWarnings.add(url);
      console.warn(`[Áudio] Falha ao iniciar ${label}: ${url}`, error);
    }
  }

  function playHtmlEffect(name, effect, preferredFile = null) {
    const file = preferredFile && effect.voicePools.has(preferredFile)
      ? preferredFile
      : effect.files[Math.floor(Math.random() * effect.files.length)];
    const pool = effect.voicePools.get(file);
    const audio = pool.voices[pool.nextVoice];
    pool.nextVoice = (pool.nextVoice + 1) % pool.voices.length;
    playAudio(audio, audio.src, name);
  }

  function playMappedEffect(name, effect, clip) {
    const context = getAudioContext();
    if (!context) {
      playHtmlEffect(name, effect, clip.file);
      return;
    }
    const generation = sourceGeneration.get(name) || 0;
    loadDecodedBuffer(clip.file, context).then(async buffer => {
      if (!unlocked || generation !== (sourceGeneration.get(name) || 0)) return;
      if (context.state === 'suspended') await context.resume();
      const offset = Math.max(0, Math.min(Number.isFinite(clip.start) ? clip.start : 0, buffer.duration));
      const available = buffer.duration - offset;
      const duration = Number.isFinite(clip.duration) ? Math.min(Math.max(0, clip.duration), available) : available;
      if (duration <= 0) throw new Error(`Trecho vazio configurado para ${name}.`);

      const source = context.createBufferSource();
      const gain = context.createGain();
      source.buffer = buffer;
      gain.gain.value = effect.volume;
      source.connect(gain);
      gain.connect(context.destination);
      const sources = activeBufferSources.get(name) || new Set();
      sources.add(source);
      activeBufferSources.set(name, sources);
      source.addEventListener('ended', () => sources.delete(source), { once: true });
      source.start(context.currentTime, offset, duration);
      if (!playbackSuccesses.has(source.buffer)) {
        playbackSuccesses.add(source.buffer);
        console.log(`[Áudio] Trecho iniciado: ${clip.file} (${offset}s–${offset + duration}s)`);
      }
    }).catch(() => {
      if (unlocked && generation === (sourceGeneration.get(name) || 0)) playHtmlEffect(name, effect, clip.file);
    });
  }

  function playEffect(name) {
    if (!unlocked) return;
    const effect = effects.get(name);
    if (!effect) return;
    const now = performance.now();
    if (now - effect.lastPlayedAt < effect.minGap) return;
    effect.lastPlayedAt = now;
    const clip = audioMap[name];
    if (clip) playMappedEffect(name, effect, clip);
    else playHtmlEffect(name, effect);
  }

  function stopEffect(name) {
    const effect = effects.get(name);
    if (effect) for (const pool of effect.voicePools.values()) {
      for (const audio of pool.voices) stopAudioElement(audio);
    }
    sourceGeneration.set(name, (sourceGeneration.get(name) || 0) + 1);
    for (const source of activeBufferSources.get(name) || []) {
      try { source.stop(); } catch {}
    }
    activeBufferSources.delete(name);
  }

  function startMusic() {
    if (musicRequested || !music.paused) return;
    musicRequested = true;
    playAudio(music, music.src, 'trilha de fundo', () => { musicRequested = false; });
  }

  function stopMusic() {
    musicRequested = false;
    stopAudioElement(music);
  }

  function playEnemyDeathSound() { playEffect('enemyDeath'); }
  function playBossArrivalSound() { playEffect('bossArrival'); }
  function playBossVictorySound() {
    playEffect('bossExplosion');
    playEffect('bossVictory');
  }
  function playUpgradeSound() { playEffect('upgrade'); }
  function playSpecialSound(kind = 'fighter') {
    playEffect(kind === 'tank' ? 'specialTank' : kind === 'guard' ? 'specialGuard' : 'specialFighter');
  }
  function playPlayerDeathSound() { playEffect('playerDeath'); }

  window.SpaceInvadersAudio = Object.freeze({
    unlock, playEffect, stopEffect, startMusic, stopMusic,
    playEnemyDeathSound, playBossArrivalSound, playBossVictorySound,
    playUpgradeSound, playSpecialSound, playPlayerDeathSound
  });

  document.addEventListener('click', event => {
    const target = event.target;
    const button = target instanceof Element
      ? target.closest('#startMenu button, #startGame, #overlay button, .tools button')
      : null;
    if (!button || button.disabled) return;
    unlock();
    playEffect('menuClick');
    if (button.closest('#startMenu')) startMusic();
  }, true);

  startMusic();
  document.addEventListener('pointerdown', event => {
    const target = event.target;
    if (!(target instanceof Element) || !target.closest('#startMenu') || target.closest('#startGame')) return;
    unlock();
    startMusic();
  }, true);
  document.addEventListener('space-invaders:return-home', startMusic);
  document.addEventListener('space-invaders:planet-explosion', () => playEffect('planetExplosion'));
})();
