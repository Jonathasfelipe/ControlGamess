(() => {
    'use strict';
    const canvas = document.getElementById('game');
    const ctx = canvas.getContext('2d');
    const solarSystemsLayer = document.getElementById('backgroundSolarSystems');
    const bossBlackHole = document.getElementById('boss-black-hole');
    const blackHoleParticles = document.getElementById('black-hole-particles');
    const W = 960, H = 540;
    const ENABLE_STAGE_SELECT=true,MAX_WAVE=100,MAX_WAVE_KEY='cg-space-v2-max-wave',RENDER_LAYER={bossCompanion:1,enemy:2,boss:3};
    const LASER_DRAIN_RATE=18,LASER_RECHARGE_RATE=14,MINIBOSS_ESCORT_INTERVAL=5200,MINIBOSS_ESCORT_BATCH=2;
    const BLACK_HOLE_DEBRIS_INTERVAL=.14,BLACK_HOLE_DEBRIS_LIMIT=48;
    const prefersReducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const METEOR_SURVIVAL_DURATION=60,METEOR_SURVIVAL_INITIAL_COUNT=28,METEOR_SURVIVAL_MAX_COUNT=40,METEOR_SURVIVAL_SPAWN_INTERVAL=.24;
    const CRATE_DROP_BASE_CHANCE=.1125,CRATE_DROP_PER_WAVE=.005625,CRATE_DROP_MAX_CHANCE=.675,AUXILIARY_DROP_CHANCE=.9,SHIELD_DROP_CHANCE=.55,BOSS_REWARD_PERSISTENCE=3;
    function resizeCanvas(){
      const rect=canvas.getBoundingClientRect();
      if(!rect.width||!rect.height)return;
      const ratio=Math.min(2,window.devicePixelRatio||1);
      canvas.width=Math.round(rect.width*ratio);canvas.height=Math.round(rect.height*ratio);
      ctx.setTransform(canvas.width/W,0,0,canvas.height/H,0,0);
      ctx.imageSmoothingEnabled=true;
    }
    const ui = {
      score: document.getElementById('score'), lives: document.getElementById('lives'), wave: document.getElementById('wave'),
      weapon: document.getElementById('weapon'), shield: document.getElementById('shield'), overlay: document.getElementById('overlay'), gameView: document.getElementById('gameView'), startMenu: document.getElementById('startMenu'),
      restart: document.getElementById('restartBtn'), full: document.getElementById('fullBtn'), bossMeter: document.getElementById('bossMeter'), bossHp: document.getElementById('bossHp'),
      bossHpLabel: document.getElementById('bossHpLabel'), bossTitle: document.getElementById('bossTitle'), continueBtn: document.getElementById('continueBtn'), finalSummary: document.getElementById('finalSummary'),
      checkpointFeedback: document.getElementById('checkpointFeedback'), stageSelectGrid: document.getElementById('stageSelectGrid'),
      playHud: document.getElementById('playHud'), playScore: document.getElementById('playScore'), playLives: document.getElementById('playLives'), playScore2: document.getElementById('playScore2'), playLives2: document.getElementById('playLives2'), playOverdrive: document.getElementById('playOverdrive'), player2StartBtn: document.getElementById('player2StartBtn'), player2Stats: document.getElementById('player2Stats'), playWave: document.getElementById('playWave'), playWeapon: document.getElementById('playWeapon'), playShield: document.getElementById('playShield'), playBombs: document.getElementById('playBombs'), playAux: document.getElementById('playAux'), bombButton: document.getElementById('playBombBtn'), specialButton: document.getElementById('playSpecialBtn'),
      difficulty: document.getElementById('difficulty'), aimMode: document.getElementById('aimMode'), movementKeys: document.getElementById('movementKeys'), particles: document.getElementById('particlesToggle'), hudToggles: [...document.querySelectorAll('[data-hud-toggle]')], credits: document.getElementById('creditsScreen'), creditsRoll: document.getElementById('creditsRoll'), creditsScore: document.getElementById('creditsFinalScore')
    };
    function sanitizeInterfaceText(node){
      if(node.nodeType===Node.TEXT_NODE){const sanitized=node.nodeValue.replace(/[-\u2013\u2014]/g,'');if(sanitized!==node.nodeValue)node.nodeValue=sanitized;return;}
      if(node.nodeType!==Node.ELEMENT_NODE&&node.nodeType!==Node.DOCUMENT_FRAGMENT_NODE)return;
      if(node.nodeType===Node.ELEMENT_NODE){for(const attribute of ['aria-label','aria-description','aria-valuetext','alt','title','placeholder']){const value=node.getAttribute(attribute);if(value===null)continue;const sanitized=value.replace(/[-\u2013\u2014]/g,'');if(sanitized!==value)node.setAttribute(attribute,sanitized);}}
      for(const child of node.childNodes)sanitizeInterfaceText(child);
    }
    sanitizeInterfaceText(ui.gameView);
    new MutationObserver(records=>records.forEach(record=>{if(record.type==='characterData'||record.type==='attributes')sanitizeInterfaceText(record.target);else record.addedNodes.forEach(sanitizeInterfaceText);})).observe(ui.gameView,{attributes:true,attributeFilter:['aria-label','aria-description','aria-valuetext','alt','title','placeholder'],childList:true,characterData:true,subtree:true});
    const shieldHudOption=document.createElement('label');shieldHudOption.className='hud-toggle';shieldHudOption.innerHTML='<input type="checkbox" data-hud-toggle="shield" checked> Escudos';document.querySelector('.hud-options').append(shieldHudOption);ui.hudToggles.push(shieldHudOption.querySelector('input'));
    const bombsHudOption=document.createElement('label');bombsHudOption.className='hud-toggle';bombsHudOption.innerHTML='<input type="checkbox" data-hud-toggle="bombs" checked> Bombas';document.querySelector('.hud-options').append(bombsHudOption);ui.hudToggles.push(bombsHudOption.querySelector('input'));
    const auxiliariesHudOption=document.createElement('label');auxiliariesHudOption.className='hud-toggle';auxiliariesHudOption.innerHTML='<input type="checkbox" data-hud-toggle="auxiliaries" checked> Auxiliares';document.querySelector('.hud-options').append(auxiliariesHudOption);ui.hudToggles.push(auxiliariesHudOption.querySelector('input'));
    if(ENABLE_STAGE_SELECT){
      for(let stage=1;stage<=MAX_WAVE;stage++){
        const button=document.createElement('button');button.type='button';button.className='stage-choice';button.dataset.stage=String(stage);button.textContent=String(stage).padStart(2,'0');button.setAttribute('aria-label',`Iniciar estágio ${stage}`);ui.stageSelectGrid.appendChild(button);
      }
    }else{
      document.querySelectorAll('[data-stage-select-trigger]').forEach(button=>{button.hidden=true;});
    }
    const palette = {C:'#55ff9a',B:'#17191d',W:'#e7e9ec',Y:'#ff4654',O:'#9e2632',R:'#e3293c',P:'#9b436b',G:'#91f36c',D:'#0b0c0f',M:'#62686f'};
    const art = {
      player:['.......C........','......CCC.......','.....CCCCC......','....BBCCCBB.....','...BBBCCCBBB....','..BBBBCCCBBBB...','.BBBBBCCCBBBBB..','BBBBBBBBBBBBBBBB','BBBBBBCCCCCBBBBB','...BB.....BB....','..OO.......OO...','..OO.......OO...'],
      scout:['....G....','...GGG...','..GGGGG..','.GGWGWGG.','GGGGGGGGG','..G...G..','.G.....G.'],
      striker:['...RRR...','..RRRRR..','.RRWWWRR.','RRRRRRRRR','RR.RRR.RR','...R.R...','..R...R..'],
      tank:['..BBBBB..','.BBBBBBB.','BBBBBBBBB','BBWWBWWBB','BBBBBBBBB','..BB.BB..','.BB...BB.'],
      boss:['..........RRRRRRRR..........','........RRRRRRRRRRRR........','......RRRRRRRRRRRRRRRR......','....RRRRRRRRRRRRRRRRRRRR....','...RRRRRRRRRRRRRRRRRRRRRR...','..RRRWWRRRRRRRRRRRRWWRRRR...','.RRRRWWRRRRRRRRRRRRWWRRRRR.','RRRRRRRRRBBBBBBBBRRRRRRRRRR','RRRRRRRRBBBBBBBBBBRRRRRRRRRR','RRRRRRRBBYYBBBBYYBBRRRRRRRRR','RRRRRRRRBBBBBBBBBBRRRRRRRRRR','..RRRRRRBBBBBBBBBBRRRRRRRR..','...RRRBBRRBBBBBBRRBBRRR...','....RRBBRRRBBBBRRRBBRR....','.....RBB..RRRR..BBR.....']
    };
    const game = {
      mode:'title', score:0, lives:3, wave:1, maxWaveReached:1, enemies:[], shots:[], enemyShots:[], particles:[], pickups:[], stars:[], farStars:[], nearStars:[], boss:null, warpTransition:null,
      dir:1, lastShot:0, lastLaserTick:0, laserHudTimer:0, hudTimer:0, lastEnemyShot:0, lastFrame:0, transition:0, weapon:0, maxWeapon:0, bombAmmo:0, waveElapsed:0, waveGroupIndex:0, waveGroupCount:4, laserEnergy:100, power:0, powerMax:7, shield:0, bombs:2, auxiliaries:0, auxiliarySlots:[], auxiliaryReinforcements:[], nextAuxiliaryId:0, auxiliaryFormationMode:'default', auxiliaryFacingX:0, auxiliaryFacingY:-1, specialShield:null, specialCooldown:0, fighterOverdrive:0, fighterPulse:null, laserOn:false, laserActive:false, blasts:[], explosions:[], planetExplosions:[], formationReady:false, formationHoldUntil:0,
      player:{x:W/2-42,y:H-74,w:32,h:24,vx:0,vy:0,active:true,invuln:0,respawn:0,moveRow:0,animClock:2,moving:false},
      player2:{x:W/2+10,y:H-74,w:32,h:24,vx:0,vy:0,active:false,joined:false,lives:0,score:0,lastShot:0,invuln:0,respawn:0,moveRow:0,animClock:2,moving:false,laserOn:false},
      keys:new Set(), pointer:false, pointerX:W/2, pointerY:H-70, pointerFire:false, mouseAimActive:false, mouseAimX:W/2, mouseAimY:H-70, aimSource:'gamepad', beam:null, high:0, skin:0, difficulty:'normal', aimMode:'classic', movementKeys:'arrows', notice:'', noticeUntil:0,
      backgroundClock:0, announcement:null, meteorSurvivalRemaining:0, meteorShowerSpawnTimer:0, meteorSurvivalComplete:false,
      particlesOn:true, lastSave:0, checkpointFeedbackTimer:0, settingsReturn:'menuMain', settingsReturnMode:'menu'
    };
    // Layout padrão Gamepad API (Xbox): A=0, B=1, X=2; direcional=12–15.
    function createGamepadInput(){return{index:null,connected:false,moveX:0,moveY:0,fire:false,triggerFire:false,laserFire:false,aimX:0,aimY:-1,aimActive:false,previousButtons:Array(16).fill(false),previousTrigger:false,menuNavNextAt:0};}
    const gamepadInput=createGamepadInput(),gamepadInput2=createGamepadInput();
    const weaponNames=['PULSO','LEQUE','LANÇA','LASER','BOMBARDEIO'];
    function normalizeWave(value){const wave=Number(value);return Number.isInteger(wave)?Math.max(1,Math.min(MAX_WAVE,wave)):1;}
    function loadMaxWaveReached(){
      let maximum=1;
      try{
        const savedMaximum=Number(localStorage.getItem(MAX_WAVE_KEY));
        if(Number.isInteger(savedMaximum))maximum=Math.max(maximum,normalizeWave(savedMaximum));
      }catch(error){console.error('Não foi possível carregar o progresso máximo.',error);}
      for(const key of ['cg-space-v2-save','cg-space-v2-checkpoint']){
        try{
          const saved=JSON.parse(localStorage.getItem(key)||'null');
          if(saved)maximum=Math.max(maximum,normalizeWave(saved.maxWaveReached),normalizeWave(saved.wave));
        }catch(error){console.error('Não foi possível ler o progresso salvo.',error);}
      }
      return maximum;
    }
    game.maxWaveReached=loadMaxWaveReached();
    function rememberReachedWave(wave){
      const reached=normalizeWave(wave);
      if(reached<=game.maxWaveReached)return;
      game.maxWaveReached=reached;
      try{localStorage.setItem(MAX_WAVE_KEY,String(reached));}
      catch(error){console.error('Não foi possível salvar o progresso máximo.',error);}
      refreshStageSelect();
    }
    function refreshStageSelect(){
      if(!ui.stageSelectGrid)return;
      for(const button of ui.stageSelectGrid.querySelectorAll('button[data-stage]')){
        const stage=Number(button.dataset.stage),locked=stage>game.maxWaveReached;
        button.disabled=locked;button.classList.toggle('is-locked',locked);
        button.setAttribute('aria-label',locked?`Estágio ${stage} bloqueado`:`Iniciar estágio ${stage}`);
        button.title=locked?'Alcance este estágio para desbloqueá-lo':'Iniciar neste estágio';
      }
      const summary=document.getElementById('stageProgressSummary');
      if(summary)summary.textContent=`Maior checkpoint alcançado: estágio ${String(game.maxWaveReached).padStart(2,'0')}.`;
    }
    try{game.high=Number(localStorage.getItem('cg-space-v2-high')||0);}catch{game.high=0;}
    // Ajuste aqui a densidade e a velocidade de cada plano do campo estelar.
    const STARFIELD={
      far:{count:74,minSpeed:18,maxSpeed:62},
      mid:{count:115,minSpeed:260,maxSpeed:620},
      near:{count:38,minSpeed:720,maxSpeed:1280}
    };
    function createStarLayer(count,minSpeed,maxSpeed,minSize,maxSize,minAlpha,maxAlpha,streakFactor=0){
      return Array.from({length:count},()=>{
        const speed=minSpeed+Math.random()*(maxSpeed-minSpeed);
        return {x:Math.random()*W,y:Math.random()*H,s:minSize+Math.random()*(maxSize-minSize),v:speed,vx:0,vy:0,a:minAlpha+Math.random()*(maxAlpha-minAlpha),streak:speed*streakFactor,phase:Math.random()*Math.PI*2};
      });
    }
    game.farStars=createStarLayer(STARFIELD.far.count,STARFIELD.far.minSpeed,STARFIELD.far.maxSpeed,1,1,.16,.38);
    game.stars=createStarLayer(STARFIELD.mid.count,STARFIELD.mid.minSpeed,STARFIELD.mid.maxSpeed,1,1.3,.36,.78,.024);
    game.nearStars=createStarLayer(STARFIELD.near.count,STARFIELD.near.minSpeed,STARFIELD.near.maxSpeed,1,2,.55,.95,.022);
    function createGameplayRock(){
      return{x:Math.random()*W,y:Math.random()*H*.78,r:9+Math.random()*14,vx:(Math.random()-.5)*12,vy:9+Math.random()*19,spin:(Math.random()-.5)*.55,angle:Math.random()*Math.PI*2,sprite:Math.floor(Math.random()*8),alpha:.52+Math.random()*.3,hp:1+(Math.random()<.3?1:0),dangerous:Math.random()<.42,respawn:0};
    }
    function createSurvivalMeteor(initial=false){
      const r=10+Math.random()*10;
      return{x:Math.random()*W,y:initial?Math.random()*H*.85-H*.35:-r*2,vx:(Math.random()-.5)*90,vy:185+Math.random()*105,spin:(Math.random()-.5)*.8,angle:Math.random()*Math.PI*2,sprite:Math.floor(Math.random()*8),alpha:.76+Math.random()*.2,r,hp:1,dangerous:true,respawn:0};
    }
    game.rocks=Array.from({length:16},createGameplayRock);

    function drawArt(name,x,y,w,h,blink=false){
      const rows=art[name], cols=Math.max(...rows.map(r=>r.length)), cw=w/cols,ch=h/rows.length;
      for(let ry=0;ry<rows.length;ry++)for(let rx=0;rx<rows[ry].length;rx++){
        const char=rows[ry][rx];if(char==='.')continue;
        ctx.fillStyle=palette[char]||'#fff';
        if(blink)ctx.globalAlpha=.58+.42*Math.sin(performance.now()/75);
        ctx.fillRect(Math.round(x+rx*cw),Math.round(y+ry*ch),Math.ceil(cw),Math.ceil(ch));
      }
      ctx.globalAlpha=1;
    }
    const assetRoot='../../assets/images/space-invaders/';
    const shipAssetRoot=assetRoot+'ships/';
    const backgroundAssetRoot=assetRoot+'backgrounds/';
    const effectAssetRoot='../../assets/Space Invaders/imagens/effects/';
    const skins=[
      {name:'Exo Fighter Azul',sheet:shipAssetRoot+'SpaceInvaders-ship-fighter-exo-blue-6x4.png',preview:shipAssetRoot+'SpaceInvaders-ship-fighter-exo-blue-preview.png',hull:'#152c52',edge:'#1267c7',light:'#edf5ff',engine:'#45d8ff'},
      {name:'Exo Fighter Verde',sheet:shipAssetRoot+'SpaceInvaders-ship-fighter-exo-green-6x4.png',preview:shipAssetRoot+'SpaceInvaders-ship-fighter-exo-green-preview.png',hull:'#173b1e',edge:'#20c83e',light:'#edf5ff',engine:'#55e8d4'},
      {name:'Tank Carmesim',sheet:shipAssetRoot+'SpaceInvaders-ship-tank-crimson-6x4.png',preview:shipAssetRoot+'SpaceInvaders-ship-tank-crimson-preview.png',hull:'#282a31',edge:'#d7333e',light:'#e8e8ed',engine:'#ff8c2d'},
      {name:'Guardião Ciano',sheet:shipAssetRoot+'SpaceInvaders-ship-guard-cyan-barrier-6x4.png',preview:shipAssetRoot+'SpaceInvaders-ship-guard-cyan-barrier-preview.png',hull:'#1b2631',edge:'#1abde0',light:'#eff6ff',engine:'#58eaff'},
      {name:'Tank Âmbar',sheet:shipAssetRoot+'SpaceInvaders-ship-tank-amber-6x4.png',preview:shipAssetRoot+'SpaceInvaders-ship-tank-amber-preview.png',hull:'#292a2e',edge:'#e6a51d',light:'#f3eee5',engine:'#43c9f1'},
      {name:'Guardião Azul',sheet:shipAssetRoot+'SpaceInvaders-ship-guard-blue-barrier-6x4.png',preview:shipAssetRoot+'SpaceInvaders-ship-guard-blue-barrier-preview.png',hull:'#202632',edge:'#1474e8',light:'#f0f5ff',engine:'#54ddff'}
    ];
    function specialClass(){return [2,4].includes(game.skin)?'tank':[3,5].includes(game.skin)?'guard':'fighter';}
    function specialLabel(){return specialClass()==='tank'?'BASTIÃO':specialClass()==='guard'?'PRISMA':'OVERDRIVE';}
    const shipMovementSheets=skins.map(skin=>{const image=new Image();image.src=skin.sheet;return image;});
    const backgroundAssetDefinitions=[
      {name:'Sol 1',kind:'sun',file:'SOL 1.png'},{name:'Sol 2',kind:'sun',file:'SOL 2.png'},{name:'Sol 3',kind:'sun',file:'SOL 3.png'},
      {name:'Saturno 1',kind:'planet',file:'SATURNO 1.png'},{name:'Saturno 2',kind:'planet',file:'SATURNO 2.png'},{name:'Saturno 3',kind:'planet',file:'SATURNO 3.png'},
      {name:'Saturno pixel',kind:'planet',file:'SATURN 1.jpg',keyedBackground:'checkerboard'},
      {name:'Plutão 1',kind:'planet',file:'PLUTÃO 1.png'},{name:'Plutão 2',kind:'planet',file:'PLUTÃO 2.png'},{name:'Plutão 3',kind:'planet',file:'PLUTÃO 3.png'},
      {name:'Marte',kind:'planet',file:'MARTE.jpg',keyedBackground:'checkerboard'},{name:'Urano',kind:'planet',file:'URANO 1.jpg',keyedBackground:'checkerboard'},
      {name:'Terra 1',kind:'earth',file:'TERRA 1.png'},{name:'Terra 2',kind:'earth',file:'TERRA 2.png'},{name:'Terra 3',kind:'earth',file:'TERRA 3.png'},
      {name:'Lua 1',kind:'moon',file:'LUA 1.png'},{name:'Lua 2',kind:'moon',file:'LUA 2.png'},{name:'Lua 3',kind:'moon',file:'LUA 3.png'},
      {name:'Lua normal pixel',kind:'moon',file:'LUA PIXEL.jpg',keyedBackground:'checkerboard'}
    ];
    const backgroundAssets=backgroundAssetDefinitions.map(definition=>{
      const image=new Image(),asset={...definition,image,texture:null,ready:false};
      image.onload=()=>{asset.texture=asset.keyedBackground?createKeyedEffectTexture(image,asset.keyedBackground):image;asset.ready=true;};
      image.onerror=()=>console.error(`[Background] Falha ao carregar o asset ${asset.file}.`);
      image.src=effectAssetRoot+asset.file;
      return asset;
    });
    const solarAssets=backgroundAssets.filter(asset=>asset.kind==='sun');
    const planetAssets=backgroundAssets.filter(asset=>asset.kind==='planet');
    const earthAssets=backgroundAssets.filter(asset=>asset.kind==='earth');
    const moonAssets=backgroundAssets.filter(asset=>asset.kind==='moon');
    function createKeyedEffectTexture(image,background){
      const sprite=document.createElement('canvas');sprite.width=image.naturalWidth;sprite.height=image.naturalHeight;
      const spriteCtx=sprite.getContext('2d',{willReadFrequently:true});spriteCtx.drawImage(image,0,0);
      const pixels=spriteCtx.getImageData(0,0,sprite.width,sprite.height),data=pixels.data;
      for(let index=0;index<data.length;index+=4){
        const red=data[index],green=data[index+1],blue=data[index+2];
        const nearWhite=red>238&&green>238&&blue>238&&Math.max(red,green,blue)-Math.min(red,green,blue)<20;
        const checkerboard=background==='checkerboard'&&red>180&&Math.max(red,green,blue)-Math.min(red,green,blue)<18;
        const blueBackdrop=background==='blue'&&blue>red*1.15&&blue>green*1.08&&blue>75;
        if(nearWhite||checkerboard||blueBackdrop)data[index+3]=0;
      }
      spriteCtx.putImageData(pixels,0,0);return sprite;
    }
    const BACKGROUND_PLANET_COUNT=5,BACKGROUND_METEOR_COUNT=6,BACKGROUND_PLANET_EXPLOSION_INTERVAL=16,BACKGROUND_BLACK_HOLE_START_WAVE=8,WARP_DURATION=3,WARP_DISTANCE=H*1.35;
    const backgroundSystems=[];
    const backgroundPlanets=[];
    const incomingBackgroundSystems=[];
    const incomingBackgroundPlanets=[];
    const backgroundMeteors=[];
    const blackHoleDebris=[];
    let blackHoleDebrisSpawnTimer=0;
    let backgroundPlanetExplosionCooldown=0,backgroundPlanetExplosionCount=0,backgroundPlanetExplosionLimit=1;
    function backgroundBlackHoleChance(wave=game.wave){
      return wave<BACKGROUND_BLACK_HOLE_START_WAVE?0:Math.min(.72,.2+(wave-BACKGROUND_BLACK_HOLE_START_WAVE)*.015);
    }
    function shuffledBackgroundAssets(assets){
      const shuffled=[...assets];
      for(let index=shuffled.length-1;index>0;index--){const swap=Math.floor(Math.random()*(index+1));[shuffled[index],shuffled[swap]]=[shuffled[swap],shuffled[index]];}
      return shuffled;
    }
    function setBackgroundSunPosition(system,sun,offsetY=0){
      sun.x=system.x+Math.cos(sun.orbitAngle)*sun.orbitRadius;
      sun.y=system.y+Math.sin(sun.orbitAngle)*sun.orbitRadius;
      if(sun.element){
        sun.element.style.left=`${sun.x/W*100}%`;
        sun.element.style.top=`${(sun.y+offsetY)/H*100}%`;
      }
    }
    function createBackgroundSystem(includeSuns=true){
      const sunCount=includeSuns?1+Math.floor(Math.random()*3):0,x=W/2+(Math.random()-.5)*20,y=H/2+(Math.random()-.5)*16;
      const orbitRadius=sunCount===1?0:sunCount===2?22:30,orbitSpeed=.24+Math.random()*.12,phase=Math.random()*Math.PI*2;
      const system={x,y,suns:shuffledBackgroundAssets(solarAssets).slice(0,sunCount).map((asset,index)=>({
        asset,x,y,radius:15+Math.random()*5,orbitRadius,
        orbitAngle:phase+index*Math.PI*2/sunCount,orbitSpeed,element:null
      }))};
      for(const sun of system.suns)setBackgroundSunPosition(system,sun);
      return system;
    }
    function renderBackgroundSystems(){
      solarSystemsLayer.replaceChildren();
      const currentOffset=game.warpTransition?.currentOffsetY||0,incomingOffset=game.warpTransition?.incomingOffsetY||0;
      for(const [systems,offsetY] of [[backgroundSystems,currentOffset],[incomingBackgroundSystems,incomingOffset]]){
        for(const system of systems){
          for(const sun of system.suns){
            const element=document.createElement('div'),image=document.createElement('img');
            element.className='background-sun';
            element.style.width=`${sun.radius*2/W*100}%`;
            element.style.height=`${sun.radius*2/H*100}%`;
            image.src=sun.asset.image.src;image.alt='';image.draggable=false;image.decoding='async';
            element.appendChild(image);solarSystemsLayer.appendChild(element);sun.element=element;
            setBackgroundSunPosition(system,sun,offsetY);
          }
        }
      }
      syncBackgroundBlackHoleEffect();
    }
    function syncBackgroundBlackHoleEffect(){
      const active=!game.warpTransition&&backgroundSystems.some(system=>system.blackHole);
      bossBlackHole.hidden=!active;
    }
    function clearBlackHoleDebris(){
      for(const debris of blackHoleDebris)debris.element.remove();
      blackHoleDebris.length=0;
      blackHoleDebrisSpawnTimer=0;
    }
    function spawnBlackHoleDebris(){
      const isMeteor=Math.random()>.65,size=isMeteor?3+Math.random()*4:1.5+Math.random()*2;
      const element=document.createElement('span');
      element.className=`bh-debris ${isMeteor?'bh-meteor':'bh-star'}`;
      element.style.width=`${size}px`;element.style.height=`${size}px`;
      blackHoleParticles.appendChild(element);
      blackHoleDebris.push({
        element,angle:Math.random()*Math.PI*2,radiusX:160+Math.random()*70,
        speed:.04+Math.random()*.03,pullRate:.65+Math.random()*.45
      });
    }
    function updateBlackHoleDebris(dt,paused=false){
      if(paused||bossBlackHole.hidden||prefersReducedMotion){
        clearBlackHoleDebris();
        return;
      }
      blackHoleDebrisSpawnTimer+=dt;
      if(blackHoleDebris.length>=BLACK_HOLE_DEBRIS_LIMIT){
        blackHoleDebrisSpawnTimer=Math.min(blackHoleDebrisSpawnTimer,BLACK_HOLE_DEBRIS_INTERVAL);
      }
      while(blackHoleDebrisSpawnTimer>=BLACK_HOLE_DEBRIS_INTERVAL&&blackHoleDebris.length<BLACK_HOLE_DEBRIS_LIMIT){
        blackHoleDebrisSpawnTimer-=BLACK_HOLE_DEBRIS_INTERVAL;
        spawnBlackHoleDebris();
      }
      for(let index=blackHoleDebris.length-1;index>=0;index--){
        const debris=blackHoleDebris[index];
        debris.angle+=debris.speed*dt*60;
        debris.radiusX-=debris.pullRate*dt*60;
        if(debris.radiusX<=38){
          debris.element.remove();blackHoleDebris.splice(index,1);continue;
        }
        const y=Math.sin(debris.angle)*debris.radiusX*.24;
        const scale=Math.min(1,Math.max(.1,debris.radiusX/170));
        debris.element.style.zIndex=Math.sin(debris.angle)<0?'2':'5';
        debris.element.style.opacity=String(Math.min(1,debris.radiusX/110));
        debris.element.style.transform=`translate(${Math.cos(debris.angle)*debris.radiusX}px,${y}px) scale(${scale}) rotate(${debris.angle*50}deg)`;
      }
    }
    function updateBackgroundSystems(dt,systems=backgroundSystems,offsetY=0){
      for(const system of systems){
        for(const sun of system.suns){
          sun.orbitAngle=(sun.orbitAngle+sun.orbitSpeed*dt)%(Math.PI*2);
          setBackgroundSunPosition(system,sun,offsetY);
        }
        if(system.blackHole){system.blackHole.x=system.x;system.blackHole.y=system.y+offsetY;}
      }
    }
    function positionBackgroundPlanet(planet,systems=backgroundSystems,offsetY=0){
      if(planet.parentPlanet){
        planet.x=planet.parentPlanet.x+Math.cos(planet.orbitAngle)*planet.orbitRadius;
        planet.y=planet.parentPlanet.y+Math.sin(planet.orbitAngle)*planet.orbitRadius;
        return;
      }
      const system=systems[planet.systemIndex];
      planet.x=system.x+Math.cos(planet.orbitAngle)*planet.orbitRadius;
      planet.y=system.y+Math.sin(planet.orbitAngle)*planet.orbitRadius+offsetY;
    }
    function createBackgroundPlanet(systemIndex,orbitIndex,asset,systems=backgroundSystems){
      const size=30+Math.random()*12,orbitRadius=54+orbitIndex*33+size*.2+Math.random()*6;
      const direction=Math.random()<.5?-1:1;
      const planet={systemIndex,asset,size,orbitRadius,orbitAngle:Math.random()*Math.PI*2,orbitSpeed:direction*(.22+Math.random()*.1)/Math.sqrt(orbitRadius/55),alpha:.82+Math.random()*.18,parentPlanet:null,x:0,y:0};
      positionBackgroundPlanet(planet,systems);return planet;
    }
    function createBackgroundMoon(earth,asset){
      const moon={systemIndex:earth.systemIndex,asset,size:11+Math.random()*5,orbitRadius:earth.size*.5+13+Math.random()*4,orbitAngle:Math.random()*Math.PI*2,orbitSpeed:1.05+Math.random()*.45,alpha:.95,parentPlanet:earth,x:0,y:0};
      positionBackgroundPlanet(moon);return moon;
    }
    function applyBlackHoleGravityToPlanet(planet,systems,dt,offsetY){
      const blackHole=systems[planet.systemIndex]?.blackHole;
      if(!blackHole||planet.parentPlanet)return false;
      let distance=Math.hypot(blackHole.x-planet.x,blackHole.y-planet.y);
      if(distance<=blackHole.eventHorizonRadius)return true;
      if(distance>=blackHole.influenceRadius)return false;
      const influence=1-distance/blackHole.influenceRadius;
      planet.inwardVelocity=Math.min(220,(planet.inwardVelocity||0)+240*influence*influence*dt);
      planet.orbitRadius=Math.max(0,planet.orbitRadius-planet.inwardVelocity*dt);
      positionBackgroundPlanet(planet,systems,offsetY);
      distance=Math.hypot(blackHole.x-planet.x,blackHole.y-planet.y);
      if(distance<=blackHole.eventHorizonRadius)return true;
      return false;
    }
    function createBackgroundScene(wave=game.wave){
      const bossArena=hasBossEncounter(wave),hasBlackHole=bossArena||Math.random()<backgroundBlackHoleChance(wave);
      const system=createBackgroundSystem(!hasBlackHole),systems=[system],planets=[];
      if(hasBlackHole){
        if(bossArena){system.x=W/2;system.y=H/2;}
        const size=330+Math.random()*40;
        system.blackHole={
          x:system.x,y:system.y,size,
          influenceRadius:size*.72,eventHorizonRadius:size*.11
        };
      }
      const otherPlanets=shuffledBackgroundAssets(planetAssets).slice(0,BACKGROUND_PLANET_COUNT-1);
      const selectedAssets=shuffledBackgroundAssets([...otherPlanets,earthAssets[Math.floor(Math.random()*earthAssets.length)]]);
      for(let orbitIndex=0;orbitIndex<selectedAssets.length;orbitIndex++)planets.push(createBackgroundPlanet(0,orbitIndex,selectedAssets[orbitIndex],systems));
      const earth=planets.find(planet=>planet.asset.kind==='earth');
      planets.push(createBackgroundMoon(earth,moonAssets[Math.floor(Math.random()*moonAssets.length)]));
      return{systems,planets};
    }
    function initializeBackgroundSystems(){
      backgroundSystems.length=0;backgroundPlanets.length=0;incomingBackgroundSystems.length=0;incomingBackgroundPlanets.length=0;game.planetExplosions.length=0;game.warpTransition=null;backgroundPlanetExplosionCooldown=0;
      const scene=createBackgroundScene();backgroundSystems.push(...scene.systems);backgroundPlanets.push(...scene.planets);
      renderBackgroundSystems();
    }
    function updateBackgroundScene(dt,systems,planets,offsetY){
      updateBackgroundSystems(dt,systems,offsetY);
      for(let index=planets.length-1;index>=0;index--){
        const planet=planets[index];
        if(planet.parentPlanet)continue;
        planet.orbitAngle=(planet.orbitAngle+planet.orbitSpeed*dt)%(Math.PI*2);
        if(planet.orbitAngle<0)planet.orbitAngle+=Math.PI*2;
        positionBackgroundPlanet(planet,systems,offsetY);
        if(applyBlackHoleGravityToPlanet(planet,systems,dt,offsetY)){
          for(let childIndex=planets.length-1;childIndex>=0;childIndex--)if(planets[childIndex]===planet||planets[childIndex].parentPlanet===planet)planets.splice(childIndex,1);
        }
      }
      for(const planet of planets){
        if(!planet.parentPlanet)continue;
        planet.orbitAngle=(planet.orbitAngle+planet.orbitSpeed*dt)%(Math.PI*2);
        positionBackgroundPlanet(planet,systems,offsetY);
      }
    }
    function beginBackgroundWarp(nextWave){
      const scene=createBackgroundScene(nextWave);
      for(const system of scene.systems)if(system.blackHole)system.blackHole.y-=WARP_DISTANCE;
      incomingBackgroundSystems.push(...scene.systems);incomingBackgroundPlanets.push(...scene.planets);
      game.warpTransition={nextWave,phase:'accelerating',elapsed:0,duration:WARP_DURATION,currentOffsetY:0,incomingOffsetY:-WARP_DISTANCE,speed:1,complete:false};
      game.shots=[];game.enemyShots=[];game.pickups=[];game.beam=null;game.transition=0;
      renderBackgroundSystems();
    }
    function updateBackgroundWarp(dt){
      const warp=game.warpTransition;
      if(!warp||game.mode!=='play')return 1;
      warp.elapsed=Math.min(warp.duration,warp.elapsed+dt);
      const progress=warp.elapsed/warp.duration,eased=progress<.5?4*progress*progress*progress:1-Math.pow(-2*progress+2,3)/2;
      warp.phase=progress<.25?'accelerating':progress<.75?'cruising':'stabilizing';
      warp.currentOffsetY=WARP_DISTANCE*eased;warp.incomingOffsetY=-WARP_DISTANCE*(1-eased);
      warp.speed=1+1.5*Math.sin(Math.PI*progress);warp.complete=progress>=1;
      return warp.speed;
    }
    function completeBackgroundWarp(){
      const nextWave=game.warpTransition.nextWave;
      backgroundSystems.splice(0,backgroundSystems.length,...incomingBackgroundSystems.splice(0));
      backgroundPlanets.splice(0,backgroundPlanets.length,...incomingBackgroundPlanets.splice(0));
      game.warpTransition=null;renderBackgroundSystems();game.wave=nextWave;
      if(game.meteorSurvivalComplete){
        game.rocks=Array.from({length:16},createGameplayRock);
        game.meteorSurvivalComplete=false;game.meteorSurvivalRemaining=0;game.meteorShowerSpawnTimer=0;
      }
      rememberReachedWave(game.wave);
      game.notice='SETOR '+String(game.wave).padStart(2,'0');game.noticeUntil=performance.now()+2600;
      makeWave();announceWave();updateHud();saveProgress();
    }
    function createBackgroundMeteor(spawnAtTop=false){
      const speed=115+Math.random()*80,direction=Math.random()<.5?-1:1;
      return{x:Math.random()*W,y:spawnAtTop?-Math.random()*H*.8-16:Math.random()*H,vx:direction*(28+Math.random()*55),vy:speed,size:1.5+Math.random()*1.7,length:14+Math.random()*20,alpha:.38+Math.random()*.38,sprite:Math.floor(Math.random()*8)};
    }
    for(let index=0;index<BACKGROUND_METEOR_COUNT;index++)backgroundMeteors.push(createBackgroundMeteor(true));
    initializeBackgroundSystems();
    function backgroundPlanetDimensions(planet){
      const sprite=planet.asset.texture,height=sprite?.width?planet.size*sprite.height/sprite.width:planet.size;
      return {halfWidth:planet.size/2,halfHeight:height/2};
    }
    function spawnPlanetExplosion(x,y,size){
      if(backgroundPlanetExplosionCount>=backgroundPlanetExplosionLimit)return false;
      backgroundPlanetExplosionCount++;backgroundPlanetExplosionCooldown=BACKGROUND_PLANET_EXPLOSION_INTERVAL+Math.random()*14;
      game.planetExplosions.push({x,y,size,elapsed:0});
      document.dispatchEvent(new Event('space-invaders:planet-explosion'));
      return true;
    }
    function backgroundMeteorHitsPlanet(meteor,planet){
      const dimensions=backgroundPlanetDimensions(planet),meteorRadius=Math.max(meteor.size,meteor.length*.45);
      const dx=(meteor.x-planet.x)/(dimensions.halfWidth+meteorRadius),dy=(meteor.y-planet.y)/(dimensions.halfHeight+meteorRadius);
      return dx*dx+dy*dy<=1;
    }
    function blackHoleAtHorizon(body){
      for(const systems of [backgroundSystems,incomingBackgroundSystems]){
        for(const system of systems){
          const blackHole=system.blackHole;
          if(blackHole&&Math.hypot(body.x-blackHole.x,body.y-blackHole.y)<=blackHole.eventHorizonRadius)return blackHole;
        }
      }
      return null;
    }
    function applyBlackHoleGravity(body,dt){
      let affected=false;
      for(const systems of [backgroundSystems,incomingBackgroundSystems]){
        for(const system of systems){
          const blackHole=system.blackHole;if(!blackHole)continue;
          const dx=blackHole.x-body.x,dy=blackHole.y-body.y,distance=Math.hypot(dx,dy);
          if(distance>=blackHole.influenceRadius||distance<=blackHole.eventHorizonRadius)continue;
          const influence=1-distance/blackHole.influenceRadius,acceleration=620*influence*influence;
          body.vx+=dx/distance*acceleration*dt;body.vy+=dy/distance*acceleration*dt;affected=true;
        }
      }
      if(affected){
        const speed=Math.hypot(body.vx,body.vy),maxSpeed=360;
        if(speed>maxSpeed){body.vx=body.vx/speed*maxSpeed;body.vy=body.vy/speed*maxSpeed;}
      }
    }
    function resetBackgroundStar(star){
      star.x=Math.random()*W;star.y=-star.streak;star.vx=0;star.vy=0;
    }
    function updateBackgroundStarLayer(stars,dt,travelScale,farLayer=false){
      for(const star of stars){
        if(blackHoleAtHorizon(star)){resetBackgroundStar(star);continue;}
        applyBlackHoleGravity(star,dt);
        star.x+=star.vx*dt+(farLayer?Math.sin(game.backgroundClock*.12+star.phase)*2*dt:0);
        star.y+=(star.v*travelScale+star.vy)*dt;
        if(star.y>H+star.streak){resetBackgroundStar(star);continue;}
        if(star.x<0)star.x+=W;
        else if(star.x>W)star.x-=W;
        if(blackHoleAtHorizon(star))resetBackgroundStar(star);
      }
    }
    function updateBackgroundMeteors(dt){
      for(let index=backgroundMeteors.length-1;index>=0;index--){
        const meteor=backgroundMeteors[index];
        if(blackHoleAtHorizon(meteor)){backgroundMeteors[index]=createBackgroundMeteor(true);continue;}
        applyBlackHoleGravity(meteor,dt);
        meteor.x+=meteor.vx*dt;meteor.y+=meteor.vy*dt;
        if(blackHoleAtHorizon(meteor)){backgroundMeteors[index]=createBackgroundMeteor(true);continue;}
        if(meteor.y>H+meteor.length||meteor.x<-meteor.length||meteor.x>W+meteor.length){backgroundMeteors[index]=createBackgroundMeteor(true);continue;}
        if(game.warpTransition||backgroundPlanetExplosionCount>=backgroundPlanetExplosionLimit||backgroundPlanetExplosionCooldown>0)continue;
        let targetPlanets=backgroundPlanets,planetIndex=targetPlanets.findIndex(planet=>backgroundMeteorHitsPlanet(meteor,planet));
        if(planetIndex<0){targetPlanets=incomingBackgroundPlanets;planetIndex=targetPlanets.findIndex(planet=>backgroundMeteorHitsPlanet(meteor,planet));}
        if(planetIndex<0)continue;
        const planet=targetPlanets[planetIndex];
        spawnPlanetExplosion(planet.x,planet.y,Math.max(84,planet.size*.9));
        targetPlanets.splice(planetIndex,1);backgroundMeteors.splice(index,1);backgroundMeteors.push(createBackgroundMeteor(true));
      }
    }
    function updateBackgroundPlanets(dt){
      backgroundPlanetExplosionCooldown=Math.max(0,backgroundPlanetExplosionCooldown-dt);
      const warp=game.warpTransition;
      updateBackgroundScene(dt,backgroundSystems,backgroundPlanets,warp?.currentOffsetY||0);
      if(warp)updateBackgroundScene(dt,incomingBackgroundSystems,incomingBackgroundPlanets,warp.incomingOffsetY);
      updateBackgroundMeteors(dt);
    }
    const explosionSheet=new Image();explosionSheet.src=effectAssetRoot+'SpaceInvaders-explosion-sheet-4x2.png';
    const enemySprites={};
    for(const key of ['player','scout','interceptor','tank','bomber','gunship','striker','dreadnought','carrier','leviathan']){const image=new Image();image.src=`${shipAssetRoot}SpaceInvaders-sprite-${key}.png`;enemySprites[key]=image;}
    const spriteAliases={scoutMk2:'scout',strikerMk2:'striker',tankMk2:'tank',interceptorMk2:'interceptor',bomberMk2:'bomber',gunshipMk2:'gunship',miniDreadnought:'dreadnought',miniCarrier:'carrier',miniLeviathan:'leviathan'};
    const meteorSheet=new Image();meteorSheet.src=backgroundAssetRoot+'SpaceInvaders-meteors.png';
    const backgroundMeteorImage=new Image();let backgroundMeteorSprite=null;
    backgroundMeteorImage.onload=()=>{backgroundMeteorSprite=createKeyedEffectTexture(backgroundMeteorImage,'white');};
    backgroundMeteorImage.src=effectAssetRoot+'meteoro.jpg';
    const backgroundExplosionArt=[
      {src:'EXOPLOSÃO PIXEL.jpg',background:'white'},
      {src:'explosão 1.jpg',background:'white'},
      {src:'explosão 2.jpg',background:'blue'}
    ].map(({src,background})=>{
      const image=new Image(),art={texture:null};
      image.onload=()=>{art.texture=createKeyedEffectTexture(image,background);};
      image.src=effectAssetRoot+src;return art;
    });
    const enemyRoleByKind={scoutMk2:'scout',strikerMk2:'striker',tankMk2:'tank',interceptorMk2:'interceptor',bomberMk2:'bomber',gunshipMk2:'gunship',miniDreadnought:'miniboss',miniCarrier:'miniboss',miniLeviathan:'miniboss'};
    function enemyRole(kind){return enemyRoleByKind[kind]||kind;}
    function drawConceptSprite(kind,x,y,w,h,angle=Math.PI){
      const model=enemySprites[kind]||enemySprites[spriteAliases[kind]||enemyRole(kind)];if(!model||!model.complete||!model.naturalWidth)return false;
      ctx.save();ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';ctx.imageSmoothingEnabled=false;ctx.translate(x+w/2,y+h/2);ctx.rotate(angle);
      ctx.drawImage(model,-w/2,-h/2,w,h);ctx.restore();return true;
    }
    function poly(points,fill,stroke='#f2d5a1',line=1.5){ctx.beginPath();ctx.moveTo(points[0][0],points[0][1]);for(let i=1;i<points.length;i++)ctx.lineTo(points[i][0],points[i][1]);ctx.closePath();ctx.fillStyle=fill;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=line;ctx.stroke();}}
    function drawHero(x,y,w,h,p=game.player){
      const sheet=shipMovementSheets[game.skin]||shipMovementSheets[0];
      if(sheet?.complete&&sheet.naturalWidth>=384){
        const row=Math.max(0,Math.min(3,p.moveRow||0)),frame=p.moving?Math.floor(p.animClock)%6:2;
        ctx.save();ctx.imageSmoothingEnabled=false;ctx.drawImage(sheet,frame*64,row*64,64,64,x,y,w,h);ctx.restore();return;
      }
      if(enemySprites.player?.complete&&enemySprites.player?.naturalWidth){ctx.drawImage(enemySprites.player,x,y,w,h);return;}
      const skin=skins[game.skin]||skins[0];ctx.save();ctx.translate(x,y);ctx.scale(w/100,h/74);
      const metal=ctx.createLinearGradient(0,0,0,74);metal.addColorStop(0,skin.light);metal.addColorStop(.18,skin.edge);metal.addColorStop(.48,skin.hull);metal.addColorStop(1,'#08090b');
      ctx.shadowColor=skin.engine;ctx.shadowBlur=6;
      poly([[50,2],[60,25],[96,46],[87,59],[63,51],[58,66],[50,72],[42,66],[37,51],[13,59],[4,46],[40,25]],metal,skin.edge,2);
      ctx.shadowBlur=0;poly([[50,12],[58,39],[56,62],[50,69],[44,62],[42,39]],'#44392d','#f4dbad',1.2);
      poly([[42,28],[50,17],[58,28],[55,38],[45,38]],skin.light,'#fff6dd',1);
      poly([[7,45],[27,39],[36,48],[15,53]],skin.hull,skin.edge,1);poly([[93,45],[73,39],[64,48],[85,53]],skin.hull,skin.edge,1);
      ctx.fillStyle=skin.engine;ctx.fillRect(17,52,10,11);ctx.fillRect(73,52,10,11);ctx.fillStyle='#f1c16f';ctx.fillRect(19,60,6,8);ctx.fillRect(75,60,6,8);
      ctx.fillStyle='#fff0c9';ctx.fillRect(22,63,2,5);ctx.fillRect(78,63,2,5);
      ctx.strokeStyle='#382b20';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(18,48);ctx.lineTo(31,45);ctx.moveTo(82,48);ctx.lineTo(69,45);ctx.stroke();ctx.restore();
    }
    function drawEnemyArt(kind,x,y,w,h,angle=Math.PI){
      return drawConceptSprite(kind,x,y,w,h,angle);
    }
    function drawBossArt(kind,x,y,w,h){
      return drawConceptSprite(kind,x,y,w,h);
    }
    function setMenuView(id,mode='menu'){
      document.querySelectorAll('.menu-view').forEach(view=>{view.hidden=view.id!==id;});
      ui.overlay.hidden=false;game.mode=mode;
      const inGame=['pause','over'].includes(mode)||(mode==='settings'&&game.settingsReturnMode==='pause');
      document.querySelector('.arcade').classList.toggle('is-playing',inGame);ui.playHud.hidden=!inGame;
    }
    function refreshContinue(){
      const saved=loadCheckpoint();
      ui.continueBtn.disabled=!saved;
      ui.continueBtn.textContent=saved?`CONTINUAR · SETOR ${String(saved.wave||1).padStart(2,'0')}`:'CONTINUAR';
    }
    function totalScore(){return game.score+game.player2.score;}
    function addPlayerScore(playerId,amount){if(playerId===2)game.player2.score+=amount;else game.score+=amount;}
    function livingPlayers(){const players=[];if(game.lives>0&&game.player.active&&game.player.respawn<=0)players.push({player:game.player,id:1});if(game.player2.lives>0&&game.player2.active&&game.player2.respawn<=0)players.push({player:game.player2,id:2});return players;}
    function nearestLivingPlayer(x,y){const candidates=[];if(game.lives>0&&game.player.active)candidates.push(game.player);if(game.player2.lives>0&&game.player2.active)candidates.push(game.player2);return candidates.reduce((nearest,p)=>{const distance=Math.hypot(p.x+p.w/2-x,p.y+p.h/2-y);return !nearest||distance<nearest.distance?{player:p,distance}:nearest;},null)?.player||game.player;}
    function saveHighScore(){game.high=Math.max(game.high,totalScore());try{localStorage.setItem('cg-space-v2-high',String(game.high));}catch{}}
    function saveProgress(){
      if(game.mode==='title'||game.mode==='over')return;
      rememberReachedWave(game.wave);
      const data={score:game.score,lives:game.lives,player2Score:game.player2.score,player2Lives:game.player2.lives,player2Active:game.player2.active,wave:game.wave,maxWaveReached:game.maxWaveReached,weapon:game.weapon,maxWeapon:game.maxWeapon,bombAmmo:game.bombAmmo,laserEnergy:game.laserEnergy,shield:game.shield,bombs:game.bombs,auxiliaries:game.auxiliaries,power:game.power,skin:game.skin,difficulty:game.difficulty};
      try{localStorage.setItem('cg-space-v2-save',JSON.stringify(data));}
      catch(error){console.error('Não foi possível salvar o progresso.',error);}
      refreshContinue();
    }
    function makeCheckpointData(){return{score:game.score,lives:game.lives,player2Score:game.player2.score,player2Lives:game.player2.lives,player2Active:game.player2.active,wave:game.wave,maxWaveReached:game.maxWaveReached,weapon:game.weapon,maxWeapon:game.maxWeapon,bombAmmo:game.bombAmmo,laserEnergy:game.laserEnergy,shield:game.shield,bombs:game.bombs,auxiliaries:game.auxiliaries,power:game.power,skin:game.skin,difficulty:game.difficulty};}
    function saveCheckpoint(){
      if(game.mode!=='pause')return false;
      rememberReachedWave(game.wave);
      try{localStorage.setItem('cg-space-v2-checkpoint',JSON.stringify(makeCheckpointData()));refreshContinue();return true;}
      catch(error){console.error('Não foi possível salvar o checkpoint.',error);return false;}
    }
    function loadCheckpoint(){
      try{
        const checkpoint=JSON.parse(localStorage.getItem('cg-space-v2-checkpoint')||'null');
        if(checkpoint&&Number.isInteger(Number(checkpoint.wave))&&(Number(checkpoint.lives)>0||(checkpoint.player2Active&&Number(checkpoint.player2Lives)>0)))return checkpoint;
        const progress=JSON.parse(localStorage.getItem('cg-space-v2-save')||'null');
        return progress&&Number.isInteger(Number(progress.wave))&&(Number(progress.lives)>0||(progress.player2Active&&Number(progress.player2Lives)>0))?progress:null;
      }
      catch(error){console.error('Não foi possível carregar o checkpoint.',error);return null;}
    }
    function checkpointToContinue(){return Boolean(loadCheckpoint());}
    function retryFromCheckpoint(){if(checkpointToContinue())startGame(true);else startGame(false);}
    function showCheckpointFeedback(saved){
      window.clearTimeout(game.checkpointFeedbackTimer);
      ui.checkpointFeedback.textContent=saved?'CHECKPOINT SALVO!':'NÃO FOI POSSÍVEL SALVAR O CHECKPOINT.';
      ui.checkpointFeedback.hidden=false;
      game.checkpointFeedbackTimer=window.setTimeout(()=>{ui.checkpointFeedback.hidden=true;},2400);
    }
    function applySettings(){
      game.difficulty=ui.difficulty.value;
      game.aimMode=ui.aimMode.value==='free'?'free':'classic';
      game.movementKeys=ui.movementKeys.value==='wasd'?'wasd':'arrows';
      game.auxiliaries=Math.min(game.auxiliaries,auxiliaryCap());syncAuxiliarySlots();
      game.particlesOn=ui.particles.checked;
      for(const check of ui.hudToggles){document.querySelectorAll(`[data-hud="${check.dataset.hudToggle}"],[data-live-hud="${check.dataset.hudToggle}"]`).forEach(stat=>{stat.hidden=!check.checked;});}
      try{localStorage.setItem('cg-space-v2-settings',JSON.stringify({difficulty:game.difficulty,aimMode:game.aimMode,movementKeys:game.movementKeys,particles:game.particlesOn,hud:Object.fromEntries(ui.hudToggles.map(c=>[c.dataset.hudToggle,c.checked]))}));}catch{}
      if(game.mode!=='title'&&game.mode!=='over')updateHud();
    }
    function loadSettings(){
      try{const saved=JSON.parse(localStorage.getItem('cg-space-v2-settings')||'null');if(saved){ui.difficulty.value=saved.difficulty||'normal';ui.aimMode.value=saved.aimMode==='free'?'free':'classic';ui.movementKeys.value=saved.movementKeys==='wasd'?'wasd':'arrows';ui.particles.checked=saved.particles!==false;for(const check of ui.hudToggles){if(saved.hud&&saved.hud[check.dataset.hudToggle]===false)check.checked=false;}}}catch{}
      applySettings();
    }
    function startGame(continueSaved=false,requestedWave=1){
      window.SpaceInvadersAudio?.stopMusic();window.SpaceInvadersAudio?.stopEffect('laser');window.SpaceInvadersAudio?.stopEffect('blaster');
      const saved=continueSaved?loadCheckpoint():null;
      if(!saved&&!continueSaved&&normalizeWave(requestedWave)>game.maxWaveReached)return false;
      const savedPlayer2Active=Boolean(saved&&saved.player2Active&&Number(saved.player2Lives)>0);
      if(saved){game.score=Number(saved.score)||0;game.lives=Number.isFinite(Number(saved.lives))?Math.max(0,Math.min(3,Number(saved.lives))):3;game.player2.score=Math.max(0,Number(saved.player2Score)||0);game.wave=normalizeWave(saved.wave);game.maxWaveReached=Math.max(game.maxWaveReached,normalizeWave(saved.maxWaveReached),game.wave);game.maxWeapon=Math.max(0,Math.min(4,Number(saved.maxWeapon??saved.weapon)||0));game.weapon=Math.max(0,Math.min(game.maxWeapon,4,Number(saved.weapon)||0));game.bombAmmo=Math.max(0,Number(saved.bombAmmo??(game.maxWeapon>=4?3:0)));game.laserEnergy=Math.max(0,Math.min(100,Number(saved.laserEnergy??100)));game.shield=Math.max(0,Math.min(3,Number(saved.shield)||0));game.bombs=Math.max(0,Math.min(3,Number(saved.bombs??2)));game.skin=Math.max(0,Math.min(skins.length-1,Number(saved.skin)||0));game.power=Math.max(0,Math.min(100,Number(saved.power)||0));if(saved.difficulty)ui.difficulty.value=saved.difficulty;game.difficulty=ui.difficulty.value;game.auxiliaries=Math.max(0,Math.min(auxiliaryCap(),Number(saved.auxiliaries)||0));}
      else{game.score=0;game.lives=3;game.player2.score=0;game.wave=normalizeWave(requestedWave);game.weapon=0;game.maxWeapon=0;game.bombAmmo=0;game.laserEnergy=100;game.shield=0;game.bombs=2;game.auxiliaries=0;game.power=0;try{localStorage.removeItem('cg-space-v2-save');}catch(error){console.error('Não foi possível limpar o progresso automático.',error);}}
      syncAuxiliarySlots();game.auxiliaryReinforcements=[];game.shots=[];game.enemyShots=[];game.particles=[];game.pickups=[];game.blasts=[];game.explosions=[];game.planetExplosions=[];game.specialShield=null;game.specialCooldown=0;game.fighterOverdrive=0;game.fighterPulse=null;game.boss=null;game.beam=null;game.hudTimer=0;game.auxiliaryFormationMode='default';game.auxiliaryFacingX=0;game.auxiliaryFacingY=-1;game.laserOn=false;game.laserActive=false;game.lastLaserTick=0;game.mouseAimActive=false;game.aimSource='gamepad';game.player.active=game.lives>0;game.player.x=W/2-42;game.player.y=H-74;game.player.vx=0;game.player.vy=0;game.player.invuln=0;game.player.respawn=0;game.player2.active=savedPlayer2Active;game.player2.joined=savedPlayer2Active;game.player2.lives=savedPlayer2Active?Math.max(1,Math.min(3,Number(saved.player2Lives)||1)):0;game.player2.x=W/2+10;game.player2.y=H-74;game.player2.vx=0;game.player2.vy=0;game.player2.laserOn=false;game.player2.invuln=0;game.player2.respawn=0;game.player2.lastShot=0;game.mode='play';game.transition=0;game.warpTransition=null;ui.overlay.hidden=true;document.querySelector('.arcade').classList.add('is-playing');ui.playHud.hidden=false;resizeCanvas();applySettings();initializeBackgroundSystems();makeWave();announceWave();updateHud();game.lastSave=performance.now();saveProgress();
      if(window.parent===window&&!document.fullscreenElement&&document.querySelector('.arcade').requestFullscreen){try{document.querySelector('.arcade').requestFullscreen()?.catch(()=>{});}catch{}}
      try{canvas.focus({preventScroll:true});}catch{canvas.focus();}
      startGameLoop();
    }
    function difficultyProfile(){return game.difficulty==='easy'?{cols:5,rows:2,hp:.55,speed:.78,boss: .78,aux:8}:game.difficulty==='hard'?{cols:7,rows:4,hp:1.55,speed:1.55,boss:1.65,aux:8}:{cols:6,rows:3,hp:1,speed:1,boss:1,aux:8};}
    function difficultyFactor(){return difficultyProfile().speed;}
    function auxiliaryCap(){return difficultyProfile().aux;}
    function syncAuxiliarySlots(){
      const count=Math.max(0,Math.min(auxiliaryCap(),game.auxiliaries));
      game.auxiliarySlots=game.auxiliarySlots.slice(0,count);
      while(game.auxiliarySlots.length<count)game.auxiliarySlots.push(game.nextAuxiliaryId++);
      game.auxiliaries=game.auxiliarySlots.length;
    }
    function addAuxiliary(){
      syncAuxiliarySlots();
      if(game.auxiliaries>=auxiliaryCap())return false;
      const startX=game.player.x+game.player.w/2;
      const id=game.nextAuxiliaryId++;
      game.auxiliarySlots.push(id);game.auxiliaries=game.auxiliarySlots.length;
      const position=wingmanPositions(true).find(auxiliary=>auxiliary.id===id);
      if(position){const startY=H+30,duration=700;game.auxiliaryReinforcements.push({id,startX,startY,vy:3*(position.y-startY)/(duration/1000),startedAt:game.player.active?performance.now():null,duration});}
      return true;
    }
    function squadLayout(){
      const d=difficultyProfile();
      if(game.wave<=4){const cols=Math.min(4,d.cols),rows=Math.min(2,d.rows);return{cols,rows,count:cols*rows};}
      const count=d.cols*d.rows+Math.floor(game.wave/5),cols=Math.min(10,d.cols+Math.ceil(Math.floor(game.wave/5)/4));
      return{cols,rows:Math.ceil(count/cols),count};
    }
    function squadSize(){return squadLayout().count;}
    function waveDifficultyProgress(wave=game.wave){return Math.max(0,(wave-1)/5);}
    function waveAttackMultiplier(){return 1+Math.min(20,waveDifficultyProgress())*.025;}
    const MAIN_BOSS_HEALTH_FACTOR=.7,bossTypes=[{kind:'dreadnought',title:'DREADNOUGHT · NAVE-MÃE',w:238,h:232,hp:1},{kind:'carrier',title:'AEGIS · PORTA-CAÇAS',w:250,h:260,hp:1.2},{kind:'leviathan',title:'LEVIATÃ · NAVE DE CERCO',w:205,h:282,hp:1.15}];
    function bossStatsForWave(wave){
      const bossIndex=Math.floor(wave/5)-1,type=bossTypes[bossIndex%bossTypes.length],baseHp=Math.round((2000+wave*90)*(1+bossIndex*.05)*difficultyProfile().boss*type.hp),hp=Math.round(baseHp*MAIN_BOSS_HEALTH_FACTOR);
      return{type,hp};
    }
    // Boss principal a cada cinco ondas; mini-boss a cada três, exceto nas ondas de boss.
    function isMajorBossWave(wave){return wave>=5&&wave%5===0;}
    function isMiniBossWave(wave){return wave>=3&&wave%3===0&&!isMajorBossWave(wave);}
    function hasBossEncounter(wave){return isMajorBossWave(wave)||isMiniBossWave(wave);}
    function isMeteorSurvivalWave(wave){return wave>1&&isMajorBossWave(wave-1);}
    function miniBossHealthForWave(wave){return bossStatsForWave(Math.ceil(wave/5)*5).hp;}
    function spawnWaveGroup(groupIndex){
      const {cols,count}=squadLayout(),gap=Math.min(150,(W-170)/(cols-1)),startX=(W-gap*(cols-1))/2,roles=['scout','striker','tank','interceptor','bomber','gunship'],variants={scout:'scoutMk2',striker:'strikerMk2',tank:'tankMk2',interceptor:'interceptorMk2',bomber:'bomberMk2',gunship:'gunshipMk2'},entryDirections=['top','topLeft','topRight'];
      game.formationHoldUntil=0;let spawnedMiniBoss=null;
      for(let index=0;index<count;index++){
        const r=Math.floor(index/cols),c=index%cols,role=roles[(index+groupIndex*2+game.wave)%roles.length],miniBoss=isMiniBossWave(game.wave)&&groupIndex===3&&index===Math.floor(cols/2);
        let kind=game.wave>=2&&(index+groupIndex+game.wave)%4===0?(variants[role]||role):role;
        if(miniBoss)kind=['miniDreadnought','miniCarrier','miniLeviathan'][(game.wave-2)%3];
        const isMini=enemyRole(kind)==='miniboss',w=isMini?(kind==='miniLeviathan'?66:78):46,h=isMini?(kind==='miniLeviathan'?86:68):34,targetX=startX+c*gap-w/2,targetY=78+r*50;
        const entryFrom=entryDirections[(index+groupIndex*cols+game.wave)%entryDirections.length];
        let x=targetX,y=-h-24;
        if(entryFrom==='top'){x=targetX+(Math.random()-.5)*100;}
        else if(entryFrom==='topLeft'){x=-w-24;}
        else{x=W+24;}
        const formationSlot=index+groupIndex*cols+game.wave,flyThrough=!isMini&&formationSlot%10===0,freeRoaming=!isMini&&!flyThrough&&formationSlot%5===1;
        let flyVx=0,flyVy=0;
        if(flyThrough){
          const route=Math.floor(Math.random()*3),lane=(Math.random()-.5)*.24;
          if(route===0){x=75+Math.random()*(W-150);y=-h-24;flyVx=lane;flyVy=1;}
          else if(route===1){x=-w-24;y=-h-24;flyVx=.72+Math.random()*.3;flyVy=.72+Math.random()*.3;}
          else{x=W+24;y=-h-24;flyVx=-(.72+Math.random()*.3);flyVy=.72+Math.random()*.3;}
          const speed=190+Math.random()*65,length=Math.hypot(flyVx,flyVy)||1;flyVx=flyVx/length*speed;flyVy=flyVy/length*speed;
        }
        const waveHp=1+waveDifficultyProgress()*.035,baseHp=['tank','gunship','bomber'].includes(enemyRole(kind))?2:1,hp=isMini?miniBossHealthForWave(game.wave):Math.max(1,Math.ceil(baseHp*difficultyProfile().hp*waveHp));
        const enemy={x,y,targetX,targetY,entryFrom,entrySpeed:165+Math.random()*75,w,h,kind,hp,miniBoss:isMini,phase:Math.random()*6,entering:!flyThrough,flyThrough,freeRoaming,roaming:false,roamStartAt:0,roamTargetX:targetX,roamTargetY:targetY,nextRoamTargetAt:0,nextRoamShot:performance.now()+1500+Math.random()*1000,flyVx,flyVy,angle:flyThrough?Math.atan2(flyVy,flyVx)+Math.PI/2:Math.PI,attackShots:flyThrough?2:0,nextRaidShot:performance.now()+650+Math.random()*800};
        game.enemies.push(enemy);if(isMini)spawnedMiniBoss=enemy;
      }
      if(spawnedMiniBoss){
        spawnedMiniBoss.escortSpawnIndex=0;spawnedMiniBoss.nextEscortSpawn=performance.now()+MINIBOSS_ESCORT_INTERVAL;
        spawnMiniBossEscorts(spawnedMiniBoss,4);
      }
    }
    function spawnBossMinibosses(wave){
      const kinds=['miniDreadnought','miniCarrier','miniLeviathan'],firstKind=(Math.floor(wave/5)-1)%kinds.length,hp=Math.max(1,Math.ceil(miniBossHealthForWave(wave)/2)),now=performance.now();
      for(const [index,side] of [-1,1].entries()){
        const kind=kinds[(firstKind+index)%kinds.length],w=kind==='miniLeviathan'?66:78,h=kind==='miniLeviathan'?86:68,targetX=W/2+side*W*.34-w/2,targetY=124+index*18;
        game.enemies.push({x:targetX,y:targetY,targetX,targetY,entryFrom:'bossArena',entrySpeed:0,w,h,kind,hp,miniBoss:true,bossCompanion:true,renderLayer:RENDER_LAYER.bossCompanion,bossCompanionSide:side,phase:Math.random()*6,entering:false,flyThrough:false,freeRoaming:false,roaming:false,roamStartAt:0,roamTargetX:targetX,roamTargetY:targetY,nextRoamTargetAt:0,nextRoamShot:now+1500+Math.random()*1000,flyVx:0,flyVy:0,angle:Math.PI,attackShots:0,nextRaidShot:now+650+Math.random()*800,nextBossAttack:now+850+index*350});
      }
    }
    function spawnMiniBossEscorts(miniBoss,count){
      const w=30,h=22,hp=Math.max(1,Math.ceil(difficultyProfile().hp*(1+waveDifficultyProgress()*.035))),left=miniBoss.targetX-34,right=miniBoss.targetX+miniBoss.w+4,center=miniBoss.targetX+miniBoss.w/2-w/2,lower=miniBoss.targetY+miniBoss.h+28;
      const routes=[
        {kind:'scout',entryFrom:'top',x:center,y:-h-24,targetX:center,targetY:miniBoss.targetY-38},
        {kind:'striker',entryFrom:'diagonalLeft',x:-w-24,y:H*.45,targetX:left,targetY:miniBoss.targetY+20},
        {kind:'interceptor',entryFrom:'bottom',x:center,y:H+h+24,targetX:center,targetY:lower},
        {kind:'bomber',entryFrom:'diagonalRight',x:W+24,y:H*.45,targetX:right,targetY:miniBoss.targetY+20}
      ];
      for(let index=0;index<count;index++){
        const route=routes[miniBoss.escortSpawnIndex%routes.length];miniBoss.escortSpawnIndex++;
        const targetX=Math.max(18,Math.min(W-w-18,route.targetX)),targetY=Math.max(40,Math.min(H*.55,route.targetY)),dx=targetX-route.x,dy=targetY-route.y;
        game.enemies.push({x:route.x,y:route.y,targetX,targetY,entryFrom:route.entryFrom,entrySpeed:220+Math.random()*50,w,h,kind:route.kind,hp,miniBoss:false,miniBossEscort:true,phase:Math.random()*6,entering:true,flyThrough:false,flyVx:0,flyVy:0,angle:Math.atan2(dy,dx)+Math.PI/2,attackShots:0,nextRaidShot:performance.now()+650+Math.random()*800});
      }
    }
    function updateMiniBossEscorts(now){
      const miniBoss=game.enemies.find(enemy=>enemy.miniBoss&&!enemy.bossCompanion);
      if(!miniBoss||now<miniBoss.nextEscortSpawn)return;
      spawnMiniBossEscorts(miniBoss,MINIBOSS_ESCORT_BATCH);
      miniBoss.nextEscortSpawn=now+MINIBOSS_ESCORT_INTERVAL;
    }
    function makeWave(){
      game.enemies=[];game.boss=null;game.beam=null;game.dir=1;game.formationReady=false;game.formationHoldUntil=0;game.waveElapsed=0;game.waveGroupIndex=0;game.waveGroupCount=4;game.pickups=[];
      const meteorSurvivalWave=isMeteorSurvivalWave(game.wave);
      game.meteorSurvivalRemaining=meteorSurvivalWave?METEOR_SURVIVAL_DURATION:0;game.meteorShowerSpawnTimer=0;game.meteorSurvivalComplete=false;
      backgroundPlanetExplosionCount=0;backgroundPlanetExplosionLimit=1+Math.floor(Math.random()*2);backgroundPlanetExplosionCooldown=10+Math.random()*18;
      if(meteorSurvivalWave){
        game.waveGroupCount=0;game.enemyShots=[];game.rocks=Array.from({length:METEOR_SURVIVAL_INITIAL_COUNT},()=>createSurvivalMeteor(true));ui.bossMeter.classList.remove('on');return;
      }
      if(isMajorBossWave(game.wave)){
        const {type:bossType,hp}=bossStatsForWave(game.wave);
        game.boss={kind:bossType.kind,title:bossType.title,x:W/2-bossType.w/2,y:32,w:bossType.w,h:bossType.h,hp,max:hp,renderLayer:RENDER_LAYER.boss,phase:0,nextAttack:performance.now()+1800,nextSniperShot:performance.now()+1400,nextSniperRoundAt:0,sniperShotsRemaining:0,pattern:0,spiral:0};spawnBossMinibosses(game.wave);ui.bossTitle.textContent=bossType.title;ui.bossMeter.classList.add('on');game.waveGroupIndex=game.waveGroupCount;window.SpaceInvadersAudio?.playBossArrivalSound();return;
      }
      ui.bossMeter.classList.remove('on');spawnWaveGroup(0);game.waveGroupIndex=1;
    }
    function updateHud(){
      const score=String(game.score).padStart(6,'0'),wave=String(game.wave).padStart(2,'0'),baseWeapon=game.weapon===3?`LASER ${Math.ceil(game.laserEnergy)}%`:game.weapon===4?`BOMBAS ${game.bombAmmo}`:weaponNames[game.weapon],rapid=game.power>0&&game.weapon<3?` · RÁPIDO ${Math.ceil(game.power/game.powerMax*100)}%`:'',weapon=baseWeapon+rapid;
      ui.score.textContent=String(totalScore()).padStart(6,'0');ui.lives.textContent=game.lives;ui.wave.textContent=wave;ui.weapon.textContent=weapon;ui.shield.textContent=game.shield;ui.playScore.textContent=score;ui.playLives.textContent=game.lives;ui.playScore2.textContent=String(game.player2.score).padStart(6,'0');ui.playLives2.textContent=game.player2.lives;ui.playWave.textContent=wave;ui.playWeapon.textContent=weapon;ui.playShield.textContent=game.shield;ui.playBombs.textContent=game.bombs;ui.playAux.textContent=`${game.auxiliaries}/${auxiliaryCap()}`;
      ui.player2StartBtn.hidden=game.player2.active;ui.player2Stats.hidden=!game.player2.active;
      ui.playOverdrive.textContent=specialClass()!=='fighter'?'—':game.fighterOverdrive>0?`${Math.ceil(game.fighterOverdrive)}s`:game.specialCooldown>0?`${Math.ceil(game.specialCooldown)}s RECARREGA`:'PRONTO';
      ui.bombButton.textContent=`BOMBA ×${game.bombs}`;ui.bombButton.disabled=game.bombs<=0;
      const cls=specialClass(),label=specialLabel(),shield=game.specialShield,overdrive=cls==='fighter'&&game.fighterOverdrive>0,active=overdrive||!!shield;
      ui.specialButton.hidden=false;ui.specialButton.textContent=overdrive?`${label} ${Math.ceil(game.fighterOverdrive)}s`:shield?`${label} ${shield.hp}/${shield.maxHp}`:game.specialCooldown>0?`${label} ${Math.ceil(game.specialCooldown)}s`:`${label} C`;
      ui.specialButton.disabled=active||game.specialCooldown>0||game.mode!=='play';
      ui.specialButton.setAttribute('aria-label',overdrive?`${label}, ${Math.ceil(game.fighterOverdrive)} segundos restantes`:shield?`${label}, ${shield.hp} de ${shield.maxHp} cargas restantes`:game.specialCooldown>0?`${label}, recarregando`:`Ativar ${label} da nave`);
    }
    function joinPlayerTwo(){
      if(game.mode!=='play'||game.player2.active)return false;
      const player=game.player2;player.joined=true;player.active=true;player.lives=3;player.x=W/2+10;player.y=H-74;player.vx=0;player.vy=0;player.invuln=1.5;player.respawn=0;player.lastShot=0;
      game.notice='JOGADOR 2 ENTROU · WASD / NUM 0';game.noticeUntil=performance.now()+1800;updateHud();saveProgress();return true;
    }
    function stopLaser(){game.laserOn=false;game.laserActive=false;window.SpaceInvadersAudio?.stopEffect('laser');}
    function setCreditsBackgroundInert(inert){for(const child of ui.gameView.children)if(child!==ui.credits)child.inert=inert;}
    function showFinalCredits(){
      game.transition=0;game.mode='credits';game.keys.clear();game.pointer=false;game.pointerFire=false;stopLaser();game.beam=null;stopLaserSound();saveHighScore();stopGameLoop();
      try{localStorage.removeItem('cg-space-v2-save');localStorage.removeItem('cg-space-v2-checkpoint');}catch{}
      refreshContinue();ui.creditsScore.textContent=String(totalScore()).padStart(6,'0');ui.playHud.hidden=true;ui.overlay.hidden=true;ui.gameView.classList.add('is-playing');ui.credits.hidden=false;setCreditsBackgroundInert(true);startMenuGamepadLoop();
      ui.creditsRoll.classList.remove('is-rolling');void ui.creditsRoll.offsetWidth;ui.creditsRoll.classList.add('is-rolling');
      try{ui.credits.focus({preventScroll:true});}catch{ui.credits.focus();}
    }
    function replayFromCredits(){
      setCreditsBackgroundInert(false);ui.credits.hidden=true;ui.gameView.hidden=false;ui.gameView.classList.add('is-playing');document.body.classList.add('playing');game.mode='title';startGame(false);
    }
    function startNextWave(){
      const remainingSeconds=game.pickups.reduce((remaining,pickup)=>Math.max(remaining,pickup.persistenceRemaining||0),0);
      if(remainingSeconds>0){game.transition=remainingSeconds;return;}
      if(game.wave>=MAX_WAVE){showFinalCredits();return;}
      beginBackgroundWarp(game.wave+1);
    }
    function advancePickup(pickup,dt){
      if(pickup.persistenceRemaining>0){
        pickup.persistenceRemaining=Math.max(0,pickup.persistenceRemaining-dt);
        if(pickup.persistenceRemaining<=0)return false;
        pickup.y=Math.min(H-pickup.h,pickup.y+pickup.vy*dt);
      }else pickup.y+=pickup.vy*dt;
      return pickup.y<=H;
    }
    function updatePlayerAnimation(player,dx,dy,dt){
      if(Math.abs(dx)+Math.abs(dy)>.1){player.moveRow=Math.abs(dx)>Math.abs(dy)?(dx>0?1:3):(dy>0?2:0);player.moving=true;player.animClock=(player.animClock+dt*10)%6;}
      else{player.moveRow=0;player.moving=false;player.animClock=2;}
    }
    function moveWithInertia(player,dx,dy,dt,speedX=390,speedY=330,speedBoost=1){
      const inputLength=Math.hypot(dx,dy);if(inputLength>1){dx/=inputLength;dy/=inputLength;}
      const accelerating=inputLength>.001,acceleration=1480*speedBoost,drag=Math.exp(-(accelerating ? .32 : 1.15)*dt);
      player.vx=(player.vx+dx*acceleration*dt)*drag;player.vy=(player.vy+dy*acceleration*dt)*drag;
      const speedRatio=Math.hypot(player.vx/speedX,player.vy/speedY);if(speedRatio>1){player.vx/=speedRatio;player.vy/=speedRatio;}
      if(Math.abs(player.vx)<.45)player.vx=0;if(Math.abs(player.vy)<.45)player.vy=0;
      player.x+=player.vx*dt;player.y+=player.vy*dt;return{dx:player.vx,dy:player.vy};
    }
    function constrainPlayer(player,left=6,right=6){
      const screenMinX=0,screenMaxX=W-player.w,minX=Math.max(screenMinX,Math.min(screenMaxX,left)),maxX=Math.max(minX,Math.min(screenMaxX,W-player.w-Math.max(0,right)));
      const x=player.x,y=player.y;
      player.x=Math.max(minX,Math.min(maxX,player.x));player.y=Math.max(10,Math.min(H-player.h-10,player.y));
      if(player.x!==x)player.vx=0;if(player.y!==y)player.vy=0;
    }
    function releaseGamepadInput(input=gamepadInput,playerId=1){
      input.moveX=0;input.moveY=0;input.fire=false;input.triggerFire=false;input.laserFire=false;input.aimActive=false;input.aimX=0;input.aimY=-1;input.previousButtons=Array(16).fill(false);input.previousTrigger=false;
      input.connected=false;input.index=null;
    }
    function connectGamepad(input,pad,playerId){input.index=pad.index;input.connected=true;input.previousButtons=Array(16).fill(false);input.previousTrigger=false;input.aimX=0;input.aimY=-1;input.aimActive=true;game.notice=playerId===1?'CONTROLE P1 CONECTADO':'CONTROLE P2 CONECTADO';game.noticeUntil=performance.now()+1800;}
    function cycleWeapon(){game.weapon=(game.weapon+1)%(game.maxWeapon+1);if(game.weapon!==3)stopLaser();updateHud();}
    function gamepadMenuItems(){
      if(!ui.startMenu.hidden)return[document.getElementById('startGame')];
      let scope;
      if(!ui.credits.hidden)scope=ui.credits;
      else if(!ui.overlay.hidden)scope=[...ui.overlay.querySelectorAll('.menu-view')].find(view=>!view.hidden);
      if(!scope)return[];
      return[...scope.querySelectorAll('button:not([disabled]),select:not([disabled]),input:not([disabled])')].filter(element=>element.getClientRects().length>0&&!element.disabled);
    }
    function handleGamepadMenu(input,pad,justPressed){
      const items=gamepadMenuItems();if(!items.length){input.menuNavNextAt=0;return;}
      const now=performance.now(),dpadX=(pad.buttons[15]?.pressed?1:0)-(pad.buttons[14]?.pressed?1:0),dpadY=(pad.buttons[13]?.pressed?1:0)-(pad.buttons[12]?.pressed?1:0),axisX=Math.abs(pad.axes[0]||0)>.55?Math.sign(pad.axes[0]):0,axisY=Math.abs(pad.axes[1]||0)>.55?Math.sign(pad.axes[1]):0,navX=dpadX||axisX,navY=dpadY||axisY;
      if(!navX&&!navY)input.menuNavNextAt=0;
      if((navX||navY)&&now>=input.menuNavNextAt){
        const selected=document.activeElement,index=items.indexOf(selected);
        if(navX&&selected instanceof HTMLSelectElement){
          const next=Math.max(0,Math.min(selected.options.length-1,selected.selectedIndex+navX));
          if(next!==selected.selectedIndex){selected.selectedIndex=next;selected.dispatchEvent(new Event('change',{bubbles:true}));}
        }else{
          const step=navX||navY,next=index<0?(step<0?items.length-1:0):(index+step+items.length)%items.length;
          items[next].focus({preventScroll:true});
        }
        input.menuNavNextAt=now+260;
      }
      if(justPressed[0]){
        const selected=items.includes(document.activeElement)?document.activeElement:items[0];selected.focus({preventScroll:true});
        if(selected instanceof HTMLSelectElement){selected.selectedIndex=(selected.selectedIndex+1)%selected.options.length;selected.dispatchEvent(new Event('change',{bubbles:true}));}
        else selected.click();
      }
      if(justPressed[1]){
        const backButton=items.find(item=>item.matches('#settingsBackBtn,#skinsBackBtn,#rankingBackBtn,#tutorialBackBtn,#overviewBackBtn,#controlsBackBtn,#gameOverMenuBtn,#creditsMenuBtn,#homeBtn'));
        if(backButton)backButton.click();
      }
    }
    function pollController(input,playerId,pad,actions){
      const buttonPressed=index=>Boolean(pad.buttons[index]?.pressed||pad.buttons[index]?.value>.5),pressed=Array.from({length:16},(_,index)=>buttonPressed(index)),justPressed=pressed.map((value,index)=>value&&!input.previousButtons[index]),triggerPressed=buttonPressed(7);
      const deadZone=.22,shapeAxis=value=>Math.abs(value)>deadZone?Math.sign(value)*(Math.abs(value)-deadZone)/(1-deadZone):0;
      const analogX=shapeAxis(pad.axes[0]||0),analogY=shapeAxis(pad.axes[1]||0),dpadX=(buttonPressed(15)?1:0)-(buttonPressed(14)?1:0),dpadY=(buttonPressed(13)?1:0)-(buttonPressed(12)?1:0);
      input.moveX=Math.max(-1,Math.min(1,analogX+dpadX));input.moveY=Math.max(-1,Math.min(1,analogY+dpadY));
      const aimAxisX=pad.axes[2]||0,aimAxisY=pad.axes[3]||0,aimMagnitude=Math.hypot(aimAxisX,aimAxisY);
      if(aimMagnitude>.24){input.aimX=aimAxisX/aimMagnitude;input.aimY=aimAxisY/aimMagnitude;input.aimActive=true;if(playerId===1)game.aimSource='gamepad';}
      const playerActive=playerId===1?game.player.active:game.player2.active;
      const menuInput=playerId===1&&game.mode!=='play';
      if(menuInput)handleGamepadMenu(input,pad,justPressed);
      input.fire=game.mode==='play'&&!menuInput&&playerActive&&pressed[0]&&game.weapon!==3;
      input.triggerFire=game.mode==='play'&&!menuInput&&playerActive&&triggerPressed&&game.weapon!==3;
      input.laserFire=game.mode==='play'&&!menuInput&&playerActive&&game.weapon===3&&(pressed[0]||triggerPressed);
      if(game.mode==='play'&&!menuInput&&playerActive){
        if(justPressed[1]&&!actions.special){actions.special=true;activateClassSpecial();}
        if(justPressed[2]&&!actions.bomb){actions.bomb=true;useBomb();}
        if(justPressed[3]&&!actions.weapon){actions.weapon=true;cycleWeapon();}
      }else if(game.weapon!==3){input.fire=false;input.triggerFire=false;}
      if(justPressed[9]&&!actions.start){actions.start=true;if(game.mode==='play'){if(playerId===2&&!game.player2.active)joinPlayerTwo();else pauseGame();}else if(game.mode==='pause'||(game.mode==='settings'&&game.settingsReturnMode==='pause'))resumeGame();}
      if(justPressed[8]&&!actions.fullscreen){actions.fullscreen=true;toggleFullscreen();}
      input.previousButtons=pressed;input.previousTrigger=triggerPressed;
    }
    function pollGamepad(){
      const pads=Array.from(navigator.getGamepads?.()||[]).filter(pad=>pad?.connected),inputs=[gamepadInput,gamepadInput2];
      for(let slot=0;slot<inputs.length;slot++){const input=inputs[slot],pad=input.index===null?null:pads.find(candidate=>candidate.index===input.index);if(input.connected&&!pad){releaseGamepadInput(input,slot+1);game.notice=`CONTROLE P${slot+1} DESCONECTADO`;game.noticeUntil=performance.now()+1800;}}
      const assigned=new Set(inputs.filter(input=>input.connected).map(input=>input.index));
      for(let slot=0;slot<inputs.length;slot++){const input=inputs[slot];if(input.connected)continue;const pad=pads.find(candidate=>!assigned.has(candidate.index));if(!pad)continue;connectGamepad(input,pad,slot+1);assigned.add(pad.index);}
      const actions={special:false,bomb:false,weapon:false,start:false,fullscreen:false};
      for(let slot=0;slot<inputs.length;slot++){const input=inputs[slot];if(!input.connected)continue;const pad=pads.find(candidate=>candidate.index===input.index);if(pad)pollController(input,slot+1,pad,actions);}
    }
    function activeAimInput(){
      if(game.aimMode==='free'&&game.mouseAimActive&&game.aimSource==='mouse'){
        const player=game.player,dx=game.mouseAimX-player.x-player.w/2,dy=game.mouseAimY-player.y-player.h/2,length=Math.hypot(dx,dy);
        return{aimActive:length>1e-6,aimX:length>1e-6?dx/length:0,aimY:length>1e-6?dy/length:-1};
      }
      return gamepadInput;
    }
    function isFreeAimActive(aimInput=activeAimInput()){
      return game.aimMode==='free'&&((game.mouseAimActive&&game.aimSource==='mouse')||(gamepadInput.connected&&aimInput.aimActive));
    }
    function movePlayer(dt){
      const p=game.player;if(!p.active)return;
      if(p.respawn>0){p.respawn=Math.max(0,p.respawn-dt);p.x=W/2-42;p.y=Math.max(H-74,p.y-180*dt);p.vx=0;p.vy=0;p.moveRow=0;p.animClock=2;p.moving=false;constrainPlayer(p,0,0);if(p.respawn>0)return;p.y=H-74;}
      let dx=0,dy=0;
      const leftKey=game.movementKeys==='wasd'?'a':'arrowleft',rightKey=game.movementKeys==='wasd'?'d':'arrowright',upKey=game.movementKeys==='wasd'?'w':'arrowup',downKey=game.movementKeys==='wasd'?'s':'arrowdown';
      if(game.keys.has(leftKey))dx--;
      if(game.keys.has(rightKey))dx++;
      if(game.keys.has(upKey))dy--;
      if(game.keys.has(downKey))dy++;
      dx=Math.max(-1,Math.min(1,dx+gamepadInput.moveX));dy=Math.max(-1,Math.min(1,dy+gamepadInput.moveY));
      const overdrive=specialClass()==='fighter'&&game.fighterOverdrive>0,speedBoost=overdrive?1.35:1;let motion;
      if(game.pointer){const targetX=game.pointerX-p.x-p.w/2,targetY=game.pointerY-p.y-p.h/2,ease=Math.min(1,dt*12*speedBoost);motion={dx:targetX*ease,dy:targetY*ease};p.x+=motion.dx;p.y+=motion.dy;p.vx=dt?motion.dx/dt:0;p.vy=dt?motion.dy/dt:0;}
      else motion=moveWithInertia(p,dx,dy,dt,390*speedBoost,330*speedBoost,speedBoost);
      constrainPlayer(p,0,0);updatePlayerAnimation(p,motion.dx,motion.dy,dt);
      const controllerFire=gamepadInput.fire||gamepadInput.triggerFire;
      const firing=game.weapon===3?game.laserActive:(game.keys.has(' ')||game.pointerFire||controllerFire),now=performance.now();
      const baseCooldown=game.weapon===4?840:game.power>0?105:game.weapon===2?440:game.weapon===1?320:220,cooldown=baseCooldown/(overdrive?1.45:1);
      if(firing&&game.weapon!==3&&now-game.lastShot>cooldown){firePlayer(controllerFire||game.mouseAimActive&&game.aimSource==='mouse'||gamepadInput.connected,game.player,1,activeAimInput());game.lastShot=now;}
      if(game.power>0&&firing&&game.weapon<3)game.power=Math.max(0,game.power-dt);
      if(p.invuln>0)p.invuln-=dt;
    }
    function movePlayerTwo(dt){
      const p=game.player2;if(!p.active)return;
      if(p.respawn>0){p.respawn=Math.max(0,p.respawn-dt);p.x=W/2+10;p.y=Math.max(H-74,p.y-180*dt);p.vx=0;p.vy=0;p.moveRow=0;p.animClock=2;p.moving=false;constrainPlayer(p);if(p.respawn>0)return;p.y=H-74;}
      let dx=0,dy=0;if(game.keys.has('a'))dx--;if(game.keys.has('d'))dx++;if(game.keys.has('w'))dy--;if(game.keys.has('s'))dy++;dx=Math.max(-1,Math.min(1,dx+gamepadInput2.moveX));dy=Math.max(-1,Math.min(1,dy+gamepadInput2.moveY));
      const motion=moveWithInertia(p,dx,dy,dt);constrainPlayer(p);updatePlayerAnimation(p,motion.dx,motion.dy,dt);
      const now=performance.now(),controllerFire=gamepadInput2.fire||gamepadInput2.triggerFire,keyboardFire=game.keys.has('numpad0');
      if(game.weapon!==3&&controllerFire&&now-p.lastShot>220){firePlayer(true,p,2,gamepadInput2);p.lastShot=now;}
      else if(game.weapon!==3&&keyboardFire&&now-p.lastShot>=270){game.shots.push({x:p.x+p.w/2-3,y:p.y-6,w:6,h:18,vx:0,vy:-560,dmg:1,color:'#ffcc66',owner:2});window.SpaceInvadersAudio?.playEffect('blaster');p.lastShot=now;}
      if(p.invuln>0)p.invuln-=dt;
    }
    function updateAuxiliaryFormation(){
      const p=game.player,cornerX=Math.min(W*.18,Math.max(72,p.w*2)),cornerY=Math.min(H*.18,Math.max(72,p.h*2));
      const hysteresis=12,hasHorizontalFormation=game.auxiliaryFormationMode!=='default'&&game.auxiliaryFacingX!==0;
      const nearLeft=p.x<cornerX+(hasHorizontalFormation&&game.auxiliaryFacingX>0?hysteresis:0),nearRight=p.x+p.w>W-cornerX-(hasHorizontalFormation&&game.auxiliaryFacingX<0?hysteresis:0);
      const nearTop=p.y<cornerY+(game.auxiliaryFormationMode==='shell'&&game.auxiliaryFacingY>0?hysteresis:0),nearBottom=p.y+p.h>H-cornerY-(game.auxiliaryFormationMode==='shell'&&game.auxiliaryFacingY<0?hysteresis:0);
      const atCorner=(nearLeft||nearRight)&&(nearTop||nearBottom);
      if(atCorner){
        const facingX=nearLeft?1:-1,facingY=nearTop?1:-1,length=Math.hypot(facingX,facingY);
        game.auxiliaryFormationMode='shell';game.auxiliaryFacingX=facingX/length;game.auxiliaryFacingY=facingY/length;
      }else if(nearLeft||nearRight){
        game.auxiliaryFormationMode='front';game.auxiliaryFacingX=nearLeft?1:-1;game.auxiliaryFacingY=0;
      }else{
        game.auxiliaryFormationMode='default';game.auxiliaryFacingX=0;game.auxiliaryFacingY=-1;
      }
    }
    function wingmanOffsets(){
      const base=[[-48,-8],[48,-8],[-84,12],[84,12],[0,-54],[-28,-56],[28,-56],[0,-94]];
      if(game.auxiliaryFormationMode==='default')return base;
      const points=game.auxiliaryFormationMode==='shell'?[[-62,12],[-52,42],[0,64],[52,42],[62,12],[-88,20],[88,20],[0,100]]:[[-46,30],[-24,50],[0,68],[24,50],[46,30],[-72,18],[72,18],[0,100]];
      const lateralX=-game.auxiliaryFacingY,lateralY=game.auxiliaryFacingX;
      return points.map(([side,forward])=>[game.auxiliaryFacingX*forward+lateralX*side,game.auxiliaryFacingY*forward+lateralY*side]);
    }
    function wingmanPositions(includeInactive=false){
      if((!game.player.active&&!includeInactive)||!game.auxiliaries)return [];
      const positions=wingmanOffsets().slice(0,game.auxiliaries).map(([offsetX,offsetY],index)=>({id:game.auxiliarySlots[index],x:game.player.x+game.player.w/2+offsetX,y:game.player.y+offsetY}));
      if(!positions.length)return positions;
      const visibleRadius=13,minX=Math.min(...positions.map(({x})=>x)),maxX=Math.max(...positions.map(({x})=>x)),minY=Math.min(...positions.map(({y})=>y)),maxY=Math.max(...positions.map(({y})=>y));
      const shiftX=minX<visibleRadius?visibleRadius-minX:maxX>W-visibleRadius?W-visibleRadius-maxX:0;
      const shiftY=minY<visibleRadius?visibleRadius-minY:maxY>H-visibleRadius?H-visibleRadius-maxY:0;
      const now=performance.now();
      return positions.map(({id,x,y})=>{
        const targetX=x+shiftX,targetY=y+shiftY,reinforcement=game.auxiliaryReinforcements.find(entry=>entry.id===id);
        if(!reinforcement)return{id,x:targetX,y:targetY};
        if(reinforcement.startedAt===null&&!game.player.active)return{id,x:reinforcement.startX,y:reinforcement.startY,arrivalProgress:0};
        if(reinforcement.startedAt===null)reinforcement.startedAt=now;
        const progress=Math.max(0,Math.min(1,(now-reinforcement.startedAt)/reinforcement.duration));
        if(progress>=1)return{id,x:targetX,y:targetY};
        const eased=1-Math.pow(1-progress,3),verticalTravel=reinforcement.vy*reinforcement.duration/3000*eased;
        return{id,x:reinforcement.startX+(targetX-reinforcement.startX)*eased,y:Math.max(targetY,reinforcement.startY+verticalTravel),arrivalProgress:progress};
      });
    }
    function destroyAuxiliary(auxiliary){
      const index=game.auxiliarySlots.indexOf(auxiliary.id);
      if(index<0)return false;
      game.auxiliarySlots.splice(index,1);game.auxiliaries=game.auxiliarySlots.length;
      game.auxiliaryReinforcements=game.auxiliaryReinforcements.filter(entry=>entry.id!==auxiliary.id);
      spawnExplosion(auxiliary.x,auxiliary.y,48);burst(auxiliary.x,auxiliary.y,palette.Y,20);
      game.notice=`AUXILIAR ABATIDO · ${game.auxiliaries}/${auxiliaryCap()} RESTANTES`;game.noticeUntil=performance.now()+1200;
      updateHud();saveProgress();return true;
    }
    function destroyAuxiliaryOnImpact(rect){
      const auxiliary=wingmanPositions().find(({x,y})=>hit(rect,{x:x-13,y:y-13,w:26,h:26}));
      return auxiliary?destroyAuxiliary(auxiliary):false;
    }
    function firingStations(player=game.player,playerId=1){
      const stations=[{x:player.x+player.w/2,y:player.y-6}];
      if(playerId===1)stations.push(...wingmanPositions().map(({x,y})=>({x,y})));
      return stations;
    }
    function setDirectionalShotGeometry(shot,directionAngle,centerX,centerY,speed){
      const drawW=shot.drawW??shot.w,drawH=shot.drawH??shot.h,rotation=directionAngle+Math.PI/2,cos=Math.abs(Math.cos(rotation)),sin=Math.abs(Math.sin(rotation));
      shot.drawW=drawW;shot.drawH=drawH;shot.angle=rotation;shot.w=cos*drawW+sin*drawH;shot.h=sin*drawW+cos*drawH;
      shot.x=centerX-shot.w/2;shot.y=centerY-shot.h/2;shot.vx=Math.cos(directionAngle)*speed;shot.vy=Math.sin(directionAngle)*speed;return shot;
    }
    function createAimedShot(station,width,height,vx,vy,properties={},muzzleCenterY=9){
      const speed=Math.hypot(vx,vy)||1,directionX=vx/speed,directionY=vy/speed,directionAngle=Math.atan2(directionY,directionX),centerX=station.x+directionX*14,centerY=station.y+muzzleCenterY+(directionY+1)*9;
      return setDirectionalShotGeometry({drawW:width,drawH:height,...properties},directionAngle,centerX,centerY,speed);
    }
    function firePlayer(aimedByGamepad=false,player=game.player,playerId=1,aimInput=gamepadInput){
      if(game.weapon===4){if(game.bombAmmo<=0)return;game.bombAmmo--;updateHud();}
      window.SpaceInvadersAudio?.playEffect(game.weapon===2?'laser':'blaster');
      const mouseAim=playerId===1&&game.aimMode==='free'&&game.mouseAimActive&&game.aimSource==='mouse';
      const useFreeAim=game.aimMode==='free'&&aimInput.aimActive&&(mouseAim||aimedByGamepad||playerId===1&&gamepadInput.connected);
      const aimRotation=useFreeAim?Math.atan2(aimInput.aimY,aimInput.aimX)+Math.PI/2:0;
      const rotateVelocity=(vx,vy)=>({x:vx*Math.cos(aimRotation)-vy*Math.sin(aimRotation),y:vx*Math.sin(aimRotation)+vy*Math.cos(aimRotation)});
      for(const station of firingStations(player,playerId)){
        if(game.weapon===0){const velocity=rotateVelocity(0,-560),shot=useFreeAim?createAimedShot(station,6,18,velocity.x,velocity.y,{dmg:1,color:palette.C,owner:playerId}):{x:station.x-3,y:station.y,w:6,h:18,vx:0,vy:-560,dmg:1,color:playerId===2?'#ffcc66':palette.C,owner:playerId};game.shots.push(shot);}
        if(game.weapon===1)[-.28,0,.28].forEach(a=>{const baseVx=Math.sin(a)*190,baseVy=-510,velocity=rotateVelocity(baseVx,baseVy),shot=useFreeAim?createAimedShot(station,6,18,velocity.x,velocity.y,{dmg:1,color:palette.G,owner:playerId}):{x:station.x-3,y:station.y,w:6,h:18,vx:baseVx,vy:baseVy,dmg:1,color:palette.G,owner:playerId};game.shots.push(shot);});
        if(game.weapon===2){const velocity=rotateVelocity(0,-710),shot=useFreeAim?createAimedShot(station,10,38,velocity.x,velocity.y,{dmg:4,color:palette.Y,laser:true,lance:true,hits:0,hitTargets:new Set(),owner:playerId},11):{x:station.x-5,y:station.y-8,w:10,h:38,vx:0,vy:-710,dmg:4,color:palette.Y,laser:true,lance:true,hits:0,hitTargets:new Set(),owner:playerId};game.shots.push(shot);}
        if(game.weapon===4){const velocity=rotateVelocity(0,-330),shot=useFreeAim?createAimedShot(station,14,18,velocity.x,velocity.y,{type:'bomb',dmg:6,fuse:1.35,color:palette.Y,owner:playerId},-3):{type:'bomb',x:station.x-7,y:station.y-12,w:14,h:18,vx:0,vy:-330,dmg:6,fuse:1.35,color:palette.Y,owner:playerId};game.shots.push(shot);}
      }
    }
    function stopLaserSound(){window.SpaceInvadersAudio?.stopEffect('laser');window.SpaceInvadersAudio?.stopEffect('blaster');}
    function updateLaserState(dt){
      const requested=game.mode==='play'&&game.weapon===3&&(game.keys.has(' ')||game.pointerFire||gamepadInput.laserFire),canFire=requested&&game.player.active&&game.player.respawn<=0,wasActive=game.laserActive;
      if(canFire&&game.laserEnergy>0)game.laserEnergy=Math.max(0,game.laserEnergy-LASER_DRAIN_RATE*dt);
      else if(!requested)game.laserEnergy=Math.min(100,game.laserEnergy+LASER_RECHARGE_RATE*dt);
      game.laserActive=canFire&&game.laserEnergy>0;game.laserOn=game.laserActive;
      if(game.laserActive&&!wasActive)window.SpaceInvadersAudio?.playEffect('laser');
      else if(!game.laserActive&&wasActive)window.SpaceInvadersAudio?.stopEffect('laser');
      game.hudTimer+=dt;if(game.hudTimer>=.16){game.hudTimer=0;updateHud();}
    }
    function ricochetLance(shot,impactX,impactY){
      const speed=Math.hypot(shot.vx,shot.vy)||710,angle=Math.atan2(shot.vy,shot.vx)+Math.PI;
      shot.drawW=shot.drawW??10;shot.drawH=shot.drawH??38;setDirectionalShotGeometry(shot,angle,impactX,impactY,speed);
      shot.ricochets=shot.hits;
    }
    function resolveLanceHit(shot,shotIndex,enemyIndex){
      const enemy=game.enemies[enemyIndex],x=enemy.x+enemy.w/2,y=enemy.y+enemy.h/2;
      shot.hits++;shot.hitTargets.add(enemy);
      if(shot.hits>=4){
        detonateLance(shot,shotIndex,x,y);
        game.notice='LANÇA · HIT 4/4 · EXPLOSÃO MORTAL';game.noticeUntil=performance.now()+1000;
        return;
      }

      enemy.hp-=lanceImpactDamage(shot);
      if(enemy.hp<=0)killEnemy(enemyIndex,false,shot.owner||1);else burst(x,y,palette.Y,8);
      game.notice=`LANÇA · HIT ${shot.hits}/4`;game.noticeUntil=performance.now()+750;
      ricochetLance(shot,x,y);
    }
    function resolveLanceBossHit(shot,shotIndex){
      const boss=game.boss,x=boss.x+boss.w/2,y=boss.y+boss.h/2;
      shot.hits++;shot.hitTargets.add(boss);
      if(shot.hits>=4){
        detonateLance(shot,shotIndex,x,y);
        game.notice='LANÇA · HIT 4/4 · EXPLOSÃO MORTAL';game.noticeUntil=performance.now()+1000;
        return;
      }

      boss.hp-=lanceImpactDamage(shot);burst(x,y,palette.Y,8);
      if(boss.hp<=0){defeatBoss(boss,120,shot.owner||1);game.shots.splice(shotIndex,1);return;}
      else{const pct=boss.hp/boss.max;ui.bossHp.style.width=`${pct*100}%`;ui.bossHpLabel.textContent=`${Math.ceil(pct*100)}%`;}
      game.notice=`LANÇA · HIT ${shot.hits}/4`;game.noticeUntil=performance.now()+750;
      ricochetLance(shot,x,y);
    }
    function detonateLance(shot,shotIndex,x,y){
      const radius=96,damage=.35,bossDamage=18,owner=shot.owner||1;
      game.blasts.push({x,y,r:8,speed:radius/.36,life:.36,maxLife:.36,color:palette.Y});spawnExplosion(x,y,112);burst(x,y,palette.Y,42);
      for(let i=game.enemies.length-1;i>=0;i--){
        const enemy=game.enemies[i],nx=Math.max(enemy.x,Math.min(x,enemy.x+enemy.w)),ny=Math.max(enemy.y,Math.min(y,enemy.y+enemy.h)),distance=Math.hypot(x-nx,y-ny);
        if(distance>radius)continue;
        enemy.hp-=Math.max(.05,damage*(1-distance/radius));
        if(enemy.hp<=0)killEnemy(i,true,owner);else burst(enemy.x+enemy.w/2,enemy.y+enemy.h/2,palette.Y,8);
      }
      if(game.boss){
        const boss=game.boss,nx=Math.max(boss.x,Math.min(x,boss.x+boss.w)),ny=Math.max(boss.y,Math.min(y,boss.y+boss.h)),distance=Math.hypot(x-nx,y-ny);
        if(distance<=radius){boss.hp-=Math.max(.05,bossDamage*(1-distance/radius));if(boss.hp<=0)defeatBoss(boss,180,owner);else{const pct=boss.hp/boss.max;ui.bossHp.style.width=`${pct*100}%`;ui.bossHpLabel.textContent=`${Math.ceil(pct*100)}%`;}}
      }
      game.shots.splice(shotIndex,1);
    }
    function lanceImpactDamage(shot){return Math.max(.15,shot.dmg*.15-(shot.hits-1)*.15);}
    function resolveLanceMeteorHit(shot,shotIndex,meteor){
      const x=shot.x+shot.w/2,y=shot.y+shot.h/2;
      shot.hits++;shot.hitTargets.add(meteor);
      if(shot.hits>=4){meteor.hp-=1;if(meteor.hp<=0)breakMeteor(meteor,shot.owner||1);detonateLance(shot,shotIndex,x,y);return;}
      meteor.hp-=1;
      if(meteor.hp<=0)breakMeteor(meteor,shot.owner||1);else burst(meteor.x,meteor.y,palette.Y,7);
      ricochetLance(shot,x,y);
    }
    function updateContinuousLaser(dt){
      if(!game.laserActive)return;
      game.lastLaserTick-=dt;if(game.lastLaserTick>0)return;game.lastLaserTick=.12/(specialClass()==='fighter'&&game.fighterOverdrive>0?1.45:1);
      const beams=laserRaySegments(),visibleBeams=beams.map(beam=>clipLaserBeamAtTarget(beam));
      for(const r of game.rocks){if(r.hp<=0)continue;const hits=visibleBeams.filter(beam=>segmentIntersectsAabb(beam.x1,beam.y1,beam.x2,beam.y2,r.x-r.r,r.y-r.r,r.x+r.r,r.y+r.r)).length;if(hits){r.hp-=hits*.12;if(r.hp<=0)breakMeteor(r,1);}}
      for(const beam of beams){
        for(const collision of laserTargetIntersections(beam)){
          if(collision.kind==='enemy'){
            const index=game.enemies.indexOf(collision.target);if(index<0)continue;
            const enemy=collision.target;enemy.hp--;burst(enemy.x+enemy.w/2,enemy.y+enemy.h/2,palette.C,4);
            if(enemy.hp<=0)killEnemy(index,false,1);else break;
          }else if(game.boss===collision.target){
            const boss=game.boss;boss.hp-=3;burst(boss.x+boss.w/2,boss.y+boss.h/2,palette.C,4);
            if(boss.hp<=0)defeatBoss(boss,120,1);else break;
          }
        }
      }
    }
    function laserRaySegments(){
      const aimInput=activeAimInput(),freeAim=isFreeAimActive(aimInput);
      let dx=freeAim?aimInput.aimX:0,dy=freeAim?aimInput.aimY:-1;const length=Math.hypot(dx,dy);if(length<1e-6){dx=0;dy=-1;}else{dx/=length;dy/=length;}
      return firingStations().map(station=>{let distance=Infinity;if(dx>0)distance=Math.min(distance,(W-station.x)/dx);else if(dx<0)distance=Math.min(distance,-station.x/dx);if(dy>0)distance=Math.min(distance,(H-station.y)/dy);else if(dy<0)distance=Math.min(distance,-station.y/dy);distance=Math.max(0,Number.isFinite(distance)?distance:0);return{x1:station.x,y1:station.y,x2:station.x+dx*distance,y2:station.y+dy*distance};});
    }
    function laserTargetIntersections(beam){
      const targets=[];
      for(const enemy of game.enemies){
        const entry=segmentAabbEntry(beam.x1,beam.y1,beam.x2,beam.y2,enemy.x-4,enemy.y,enemy.x+enemy.w+4,enemy.y+enemy.h);
        if(entry!==null)targets.push({kind:'enemy',target:enemy,entry});
      }
      if(game.boss){
        const boss=game.boss,entry=segmentAabbEntry(beam.x1,beam.y1,beam.x2,beam.y2,boss.x,boss.y,boss.x+boss.w,boss.y+boss.h);
        if(entry!==null)targets.push({kind:'boss',target:boss,entry});
      }
      return targets.sort((a,b)=>a.entry-b.entry);
    }
    function clipLaserBeamAtTarget(beam){
      const target=laserTargetIntersections(beam)[0];
      if(!target)return beam;
      return{...beam,x2:beam.x1+(beam.x2-beam.x1)*target.entry,y2:beam.y1+(beam.y2-beam.y1)*target.entry};
    }
    function laserSegments(){return laserRaySegments().map(clipLaserBeamAtTarget);}
    function explodePlayerBomb(shot){
      const x=shot.x+shot.w/2,y=shot.y+shot.h/2,radius=game.player.w*1.1;game.blasts.push({x,y,r:5,speed:radius/.42,life:.42,maxLife:.42,color:palette.Y});spawnExplosion(x,y,68);burst(x,y,palette.Y,18);
      for(let i=game.enemies.length-1;i>=0;i--){const e=game.enemies[i],nx=Math.max(e.x,Math.min(x,e.x+e.w)),ny=Math.max(e.y,Math.min(y,e.y+e.h)),dist=Math.hypot(x-nx,y-ny);if(dist>radius)continue;e.hp-=Math.max(2,Math.ceil(shot.dmg*(1-dist/radius)*2));if(e.hp<=0)killEnemy(i,false,shot.owner||1);else burst(e.x+e.w/2,e.y+e.h/2,palette.Y,7);}
      if(game.boss){const b=game.boss,nx=Math.max(b.x,Math.min(x,b.x+b.w)),ny=Math.max(b.y,Math.min(y,b.y+b.h)),dist=Math.hypot(x-nx,y-ny);if(dist<=radius){b.hp-=Math.max(25,Math.ceil(150*(1-dist/radius)));if(b.hp<=0)defeatBoss(b,120,shot.owner||1);}}
    }
    function fireEnemy(x,y,vx=0,vy=185,color=palette.R,size=9){const waveSpeed=waveAttackMultiplier();game.enemyShots.push({x,y,vx:vx*waveSpeed,vy:vy*waveSpeed,w:size,h:size*1.5,color});}
    function fireSniperShot(x,y,target=game.player){
      const dx=target.x+target.w/2-x,dy=target.y+target.h/2-y,distance=Math.hypot(dx,dy)||1,speed=690*waveAttackMultiplier();
      game.enemyShots.push({x:x-5.5,y:y-8.5,vx:dx/distance*speed,vy:dy/distance*speed,w:11,h:17,color:'#ff5f79',sniper:true});
    }
    function bossSniperVolleySize(wave=game.wave){
      if(wave<=1)return 1;
      if(wave<=20)return 2;
      if(wave<=50)return 4;
      return Math.min(12,5+Math.ceil((wave-50)*.14));
    }
    function updateBossSniperVolley(boss,now,x,y){
      if(boss.sniperShotsRemaining>0){
        if(now<boss.nextSniperRoundAt)return;
        fireSniperShot(x,y,nearestLivingPlayer(x,y));
        boss.sniperShotsRemaining--;
        if(boss.sniperShotsRemaining>0)boss.nextSniperRoundAt=now+Math.max(70,150-game.wave*.75);
        else boss.nextSniperShot=now+2600;
        return;
      }
      if(now<boss.nextSniperShot)return;
      fireSniperShot(x,y,nearestLivingPlayer(x,y));
      boss.sniperShotsRemaining=bossSniperVolleySize()-1;
      if(boss.sniperShotsRemaining>0)boss.nextSniperRoundAt=now+Math.max(70,150-game.wave*.75);
      else boss.nextSniperShot=now+2600;
    }
    function detonateClassShield(shield){
      const p=game.player,x=p.x+p.w/2,y=p.y+p.h/2,tank=shield.kind==='tank',absorbed=shield.absorbed,radius=tank?155+Math.min(55,absorbed*5):88+Math.min(52,absorbed*13),damage=tank?8+Math.floor(absorbed/3):2+Math.floor(absorbed/2),color=tank?'#ffb743':'#58eaff';
      game.blasts.push({x,y,r:8,speed:radius/.52,life:.52,maxLife:.52,color});spawnExplosion(x,y,Math.min(220,radius*1.42));burst(x,y,color,tank?38:28);
      for(let i=game.enemyShots.length-1;i>=0;i--){const shot=game.enemyShots[i];if(Math.hypot(shot.x+shot.w/2-x,shot.y+shot.h/2-y)<=radius){game.enemyShots.splice(i,1);burst(shot.x+shot.w/2,shot.y+shot.h/2,color,3);}}
      for(let i=game.enemies.length-1;i>=0;i--){const e=game.enemies[i],nx=Math.max(e.x,Math.min(x,e.x+e.w)),ny=Math.max(e.y,Math.min(y,e.y+e.h)),distance=Math.hypot(x-nx,y-ny);if(distance>radius)continue;e.hp-=Math.max(1,Math.ceil(damage*(1-distance/radius)));if(e.hp<=0)killEnemy(i,false,1);else burst(e.x+e.w/2,e.y+e.h/2,color,6);}
      if(game.boss){const b=game.boss,nx=Math.max(b.x,Math.min(x,b.x+b.w)),ny=Math.max(b.y,Math.min(y,b.y+b.h)),distance=Math.hypot(x-nx,y-ny);if(distance<=radius){b.hp-=Math.max(1,Math.ceil((tank?65+absorbed*8:48+absorbed*12)*(1-distance/radius)));if(b.hp<=0)defeatBoss(b,120,1);}}
      if(!tank){const target=game.enemies.reduce((best,e)=>!best||Math.hypot(e.x+e.w/2-x,e.y+e.h/2-y)<Math.hypot(best.x+best.w/2-x,best.y+best.h/2-y)?e:best,null);for(const reflection of shield.reflections){let vx=reflection?.vx||0,vy=reflection?.vy||0;if(Math.hypot(vx,vy)<1&&target){const aim=Math.atan2(target.y+target.h/2-y,target.x+target.w/2-x);vx=Math.cos(aim);vy=Math.sin(aim);}else if(Math.hypot(vx,vy)<1){vx=0;vy=-1;}const speed=Math.max(320,Math.min(520,Math.hypot(vx,vy)*1.3)),length=Math.hypot(vx,vy)||1;game.shots.push({x:x-5,y:y-5,w:10,h:10,vx:vx/length*speed,vy:vy/length*speed,dmg:3+Math.floor(absorbed/2),color:'#8af2ff',reflected:true});}}
      game.notice=tank?'BLINDAGEM DETONADA':'ENERGIA REFLETIDA · CONTRA-ATAQUE';game.noticeUntil=performance.now()+1800;updateHud();
    }
    function endClassSpecial(){const shield=game.specialShield;if(!shield)return;game.specialShield=null;detonateClassShield(shield);}
    function activateFighterSpecial(){
      const p=game.player,cx=p.x+p.w/2,range=270,halfWidth=82;
      game.fighterOverdrive=5;game.fighterPulse={x:cx,y:p.y,elapsed:0,duration:.52};
      game.blasts.push({x:cx,y:p.y-range*.58,r:8,speed:range/.52,life:.52,maxLife:.52,color:'#45d8ff'});
      spawnExplosion(cx,p.y-range*.62,108);burst(cx,p.y-range*.42,'#45d8ff',42);
      for(let i=game.enemies.length-1;i>=0;i--){
        const enemy=game.enemies[i],ex=enemy.x+enemy.w/2,ey=enemy.y+enemy.h/2,depth=p.y-ey;
        if(depth<0||depth>range||Math.abs(ex-cx)>halfWidth+depth*.12)continue;
        enemy.hp-=Math.max(3,Math.ceil(9*(1-depth/(range*1.6))));
        if(enemy.hp<=0)killEnemy(i,false,1);else burst(ex,ey,'#45d8ff',10);
      }
      if(game.boss){const boss=game.boss,bx=boss.x+boss.w/2,by=boss.y+boss.h/2,depth=p.y-by;if(depth>=0&&depth<=range+boss.h/2&&Math.abs(bx-cx)<=halfWidth+depth*.12){boss.hp-=190;burst(bx,by,'#45d8ff',20);if(boss.hp<=0)defeatBoss(boss,140,1);}}
      game.specialCooldown=26;game.notice='EXOFIGHTER · PULSO VETORIAL + OVERDRIVE';game.noticeUntil=performance.now()+1900;updateHud();
    }
    function activateClassSpecial(){
      if(game.mode!=='play'||game.specialCooldown>0||game.specialShield||!game.player.active||game.player.respawn>0)return;
      const kind=specialClass();
      window.SpaceInvadersAudio?.playSpecialSound(kind);
      if(kind==='fighter'){activateFighterSpecial();return;}
      const isTank=kind==='tank';game.specialShield={kind,hp:isTank?9:4,maxHp:isTank?9:4,duration:isTank?8:5.5,elapsed:0,absorbed:0,reflections:[]};game.specialCooldown=isTank?23:19;
      game.notice=isTank?'BASTIÃO DE CERCO · 9 CARGAS':'PRISMA REVERSOR · 4 CARGAS';game.noticeUntil=performance.now()+1700;updateHud();
    }
    function loseLife(source=null,player=game.player,playerId=1){
      const lives=()=>playerId===1?game.lives:player.lives;
      if(!player.active||lives()<=0||player.invuln>0)return;
      if(playerId===1&&game.specialShield){const shield=game.specialShield;shield.hp=Math.max(0,shield.hp-1);shield.absorbed++;if(shield.kind==='guard')shield.reflections.push(source&&Number.isFinite(source.vx)&&Number.isFinite(source.vy)?{vx:-source.vx,vy:-source.vy}:null);player.invuln=.28;burst(player.x+player.w/2,player.y+player.h/2,shield.kind==='tank'?'#ffb743':'#58eaff',8);if(shield.hp<=0)endClassSpecial();else updateHud();return;}
      if(playerId===1&&game.shield>0){game.shield--;player.invuln=.85;burst(player.x+player.w/2,player.y+player.h/2,palette.C,20);updateHud();saveProgress();return;}
      window.SpaceInvadersAudio?.playPlayerDeathSound();spawnExplosion(player.x+player.w/2,player.y+player.h/2,64);burst(player.x+player.w/2,player.y+player.h/2,palette.R,24);
      if(playerId===1){stopLaser();game.specialShield=null;game.fighterOverdrive=0;game.lives--;player.active=game.lives>0;}
      else{player.lives--;player.active=player.lives>0;}
      player.invuln=player.active?2.1:999;player.respawn=player.active?0.72:0;
      if(player.active){player.x=playerId===1?W/2-42:W/2+10;player.y=H-player.h;constrainPlayer(player);game.notice=`NAVE ${playerId} A CAMINHO`;game.noticeUntil=performance.now()+1200;}
      updateHud();
      if(game.lives<=0&&game.player2.lives<=0){game.mode='over';saveHighScore();ui.finalSummary.textContent=`Pontuação final: ${totalScore()}. Recorde: ${game.high}.`;refreshContinue();setMenuView('menuOver','over');}
      else{saveProgress();}
    }
    function burst(x,y,color,n=12){if(!game.particlesOn)return;for(let i=0;i<n;i++){const a=Math.random()*Math.PI*2,s=40+Math.random()*180;game.particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:.3+Math.random()*.55,color,size:2+Math.random()*4});}}
    function spawnExplosion(x,y,size=52){if(!game.particlesOn)return;game.explosions.push({x,y,size,elapsed:0});}
    function announceWave(){game.announcement={text:`ESTÁGIO ${Math.ceil(game.wave/10)} · ONDA ${game.wave}`,kind:'stage',elapsed:0,duration:2.6};}
    function dropBossRewards(x,y,persistenceSeconds=BOSS_REWARD_PERSISTENCE){
      const rewards=[...Array.from({length:8},()=>({type:'wingman'})),{type:'shield'},...([1,2,3,4].map(weaponIndex=>({type:'weapon',weaponIndex})))],dropY=Math.max(80,Math.min(H*.45,y));
      rewards.forEach((reward,index)=>{
        const offset=(index-(rewards.length-1)/2)*31,pickupX=Math.max(4,Math.min(W-22,x+offset-9));
        const pickup={...reward,x:pickupX,y:dropY,w:18,h:18,vy:95};
        if(persistenceSeconds>0)pickup.persistenceRemaining=persistenceSeconds;
        game.pickups.push(pickup);
      });
    }
    function defeatBoss(boss,explosionSize=120,playerId=1){
      if(!boss||game.boss!==boss)return;
      const x=boss.x+boss.w/2,y=boss.y+boss.h/2;
      spawnExplosion(x,y,explosionSize);burst(x,y,palette.O,85);addPlayerScore(playerId,2500+game.wave*100);dropBossRewards(x,y,BOSS_REWARD_PERSISTENCE);
      game.boss=null;ui.bossMeter.classList.remove('on');game.transition=6;
      game.announcement={text:'BOSS DERROTADO · VITÓRIA!',kind:'victory',elapsed:0,duration:2.6};
      window.SpaceInvadersAudio?.playBossVictorySound();updateHud();
    }
    function drawExplosions(){if(!explosionSheet.complete||!explosionSheet.naturalWidth)return;ctx.save();ctx.imageSmoothingEnabled=false;for(const e of game.explosions){const frame=Math.min(7,Math.floor(e.elapsed/.06));ctx.drawImage(explosionSheet,(frame%4)*64,Math.floor(frame/4)*64,64,64,e.x-e.size/2,e.y-e.size/2,e.size,e.size);}ctx.restore();}
    function crateDropChance(wave=game.wave){return Math.min(CRATE_DROP_MAX_CHANCE,CRATE_DROP_BASE_CHANCE+Math.max(0,wave-1)*CRATE_DROP_PER_WAVE);}
    function randomCrateLoot(){
      const lockedWeapons=[1,2,3,4].filter(weapon=>weapon>game.maxWeapon);
      if(game.auxiliaries<auxiliaryCap()&&Math.random()<AUXILIARY_DROP_CHANCE)return{type:'wingman'};
      if(game.shield<3&&Math.random()<SHIELD_DROP_CHANCE)return{type:'shield'};
      if(lockedWeapons.length&&Math.random()<.7){
        return{type:'weapon',weaponIndex:lockedWeapons[Math.floor(Math.random()*lockedWeapons.length)]};
      }
      const upgrades=['power'];
      if(game.maxWeapon>=3)upgrades.push('laserAmmo');
      if(game.maxWeapon>=4)upgrades.push('bombAmmo');
      if(game.bombs<3)upgrades.push('bomb');
      return{type:upgrades[Math.floor(Math.random()*upgrades.length)]};
    }
    function killEnemy(index,lanceFinisher=false,playerId=1){
      const e=game.enemies[index],role=enemyRole(e.kind),isMiniBoss=e.miniBoss===true||role==='miniboss',normalExplosionSize=isMiniBoss?112:Math.max(42,Math.min(72,Math.max(e.w,e.h)*1.2));game.enemies.splice(index,1);spawnExplosion(e.x+e.w/2,e.y+e.h/2,lanceFinisher?Math.max(112,normalExplosionSize*1.5):normalExplosionSize);window.SpaceInvadersAudio?.playEnemyDeathSound();
      addPlayerScore(playerId,isMiniBoss?180:['tank','gunship'].includes(role)?30:role==='bomber'?35:['striker','interceptor'].includes(role)?20:10);
      burst(e.x+e.w/2,e.y+e.h/2,isMiniBoss?palette.R:['tank','gunship','bomber'].includes(role)?palette.Y:palette.G,isMiniBoss?38:13);
      if(isMiniBoss)dropBossRewards(e.x+e.w/2,e.y+e.h/2,BOSS_REWARD_PERSISTENCE);
      else if(Math.random()<crateDropChance())game.pickups.push({...randomCrateLoot(),x:e.x+e.w/2-9,y:e.y,w:18,h:18,vy:95});
      updateHud();
    }
    function useBomb(){
      if(game.mode!=='play'||game.bombs<=0)return;
      game.bombs--;game.blasts.push({x:game.player.x+game.player.w/2,y:game.player.y+game.player.h/2,r:8,speed:Math.hypot(W,H)/.7,life:.7,maxLife:.7});
      game.enemyShots=[];game.beam=null;burst(game.player.x+game.player.w/2,game.player.y+game.player.h/2,palette.C,55);
      for(let i=game.enemies.length-1;i>=0;i--)killEnemy(i);
      if(game.boss){const b=game.boss;b.hp=Math.max(0,b.hp-Math.ceil(b.max*.22));if(b.hp<=0)defeatBoss(b);else{const pct=b.hp/b.max;ui.bossHp.style.width=`${pct*100}%`;ui.bossHpLabel.textContent=`${Math.ceil(pct*100)}%`;}}
      game.notice='BOMBA DE EMERGÊNCIA';game.noticeUntil=performance.now()+1500;updateHud();saveProgress();
    }
    function bossLaser(b,rays,ultimate=false){game.beam={source:'boss',x:b.x+b.w/2,time:0,warn:ultimate?1.25:.95,active:ultimate?.68:.82,rays,ultimate};}
    function bossAttack(now){
      const b=game.boss;if(!b)return;
      const cx=b.x+b.w/2,cy=b.y+b.h-4;
      updateBossSniperVolley(b,now,cx,cy);
      if(now<b.nextAttack)return;
      b.nextAttack=now+Math.max(420,(b.hp<b.max*.35?1050:1580)-waveDifficultyProgress()*45)/difficultyFactor();const target=nearestLivingPlayer(cx,cy),px=target.x+target.w/2,py=target.y;
      let pattern=b.pattern++%5;
      if(b.kind==='carrier'){
        if(b.hp<b.max*.32&&Math.random()<.3)pattern=4;
        if(pattern===0){for(let i=-6;i<=6;i++)fireEnemy(cx,cy,i*62,165+Math.abs(i)*9,i%2?palette.R:palette.O,8);}
        else if(pattern===1){for(const ox of [b.x+34,b.x+b.w-34]){const a=Math.atan2(py-cy,px-ox);for(let s=-1;s<=1;s++)fireEnemy(ox,cy,Math.cos(a+s*.15)*460,Math.sin(a+s*.15)*460,palette.P,10);}}
        else if(pattern===2){for(let i=-3;i<=3;i++)fireEnemy(cx+i*22,cy,i*54,205,palette.R,9);}
        else if(pattern===3)bossLaser(b,[-62,62]);
        else bossLaser(b,[-130,-65,0,65,130],true);
        return;
      }
      if(b.kind==='leviathan'){
        if(b.hp<b.max*.32&&Math.random()<.32)pattern=4;
        if(pattern===0){const a=Math.atan2(py-cy,px-cx);for(let s=-2;s<=2;s++)fireEnemy(cx,cy,Math.cos(a+s*.09)*600,Math.sin(a+s*.09)*600,palette.R,10);}
        else if(pattern===1){for(let i=-5;i<=5;i++)fireEnemy(cx,cy,i*42,170+Math.abs(i)*11,palette.O,8);}
        else if(pattern===2){for(let i=0;i<12;i++){const a=b.spiral+i*Math.PI*2/12;fireEnemy(cx,cy,Math.cos(a)*175,Math.sin(a)*175,palette.C,8);}b.spiral+=.36;}
        else if(pattern===3)bossLaser(b,[0]);
        else bossLaser(b,[-150,-100,-50,0,50,100,150],true);
        return;
      }
      if(b.hp<b.max*.32)pattern=Math.random()<.22?4:Math.random()<.55?2:0;
      else if(Math.abs(px-cx)<125)pattern=0;
      else if(px<95||px>W-95)pattern=3;
      if(pattern===0){for(let i=-4;i<=4;i++){const a=i*.19;fireEnemy(cx,cy,Math.sin(a)*190,Math.cos(a)*190,i%2?palette.R:palette.O,8);}}
      else if(pattern===1){const a=Math.atan2(py-cy,px-cx);for(let o=-1;o<=1;o++)fireEnemy(cx,cy,Math.cos(a+o*.18)*490,Math.sin(a+o*.18)*490,palette.P,10);}
      else if(pattern===2){for(let i=0;i<10;i++){const a=b.spiral+i*Math.PI*2/10;fireEnemy(cx,cy,Math.cos(a)*155,Math.sin(a)*155,palette.C,7);}b.spiral+=.42;}
      else if(pattern===3)bossLaser(b,[0]);
      else bossLaser(b,[-100,-50,0,50,100],true);
    }
    function moveMiniBoss(enemy,dt,now){
      const target=nearestLivingPlayer(enemy.x+enemy.w/2,enemy.y+enemy.h/2),sweepX=enemy.kind==='miniLeviathan'?220:enemy.kind==='miniCarrier'?185:200,sweepY=enemy.kind==='miniLeviathan'?112:enemy.kind==='miniCarrier'?82:96;
      const desiredX=Math.max(24,Math.min(W-enemy.w-24,enemy.bossCompanion?W/2+enemy.bossCompanionSide*W*.34-enemy.w/2+Math.sin(now*.0017+enemy.phase)*sweepX*.42:target.x+target.w/2-enemy.w/2+Math.sin(now*.0017+enemy.phase)*sweepX));
      const desiredY=Math.max(38,Math.min(H*.58,enemy.targetY+Math.cos(now*.0021+enemy.phase)*sweepY));
      const dx=desiredX-enemy.x,dy=desiredY-enemy.y,distance=Math.hypot(dx,dy),step=(210+game.wave*2.1)*difficultyFactor()*dt;
      if(distance>0){const moved=Math.min(distance,step);enemy.x+=dx/distance*moved;enemy.y+=dy/distance*moved;enemy.angle=Math.atan2(dy,dx)+Math.PI/2;}
    }
    function updateBossMinibosses(dt,now){
      for(const enemy of game.enemies){
        if(!enemy.bossCompanion)continue;
        moveMiniBoss(enemy,dt,now);
        if(now>=enemy.nextBossAttack){
          fireCommonEnemyAttack(enemy);
          enemy.nextBossAttack=now+Math.max(900,1850-waveDifficultyProgress()*18)/difficultyFactor();
        }
      }
    }
    function moveFreeRoamer(enemy,dt,now){
      if(now>=enemy.nextRoamTargetAt){
        enemy.roamTargetX=40+Math.random()*(W-80);enemy.roamTargetY=45+Math.random()*H*.58;
        enemy.nextRoamTargetAt=now+700+Math.random()*1300;
      }
      const dx=enemy.roamTargetX-enemy.x,dy=enemy.roamTargetY-enemy.y,distance=Math.hypot(dx,dy),step=(150+game.wave*1.4)*difficultyFactor()*dt;
      if(distance>0){const moved=Math.min(distance,step);enemy.x+=dx/distance*moved;enemy.y+=dy/distance*moved;enemy.angle=Math.atan2(dy,dx)+Math.PI/2;}
      enemy.x+=Math.sin(now*.004+enemy.phase)*32*dt;enemy.y+=Math.cos(now*.003+enemy.phase)*24*dt;
      enemy.x=Math.max(18,Math.min(W-enemy.w-18,enemy.x));enemy.y=Math.max(36,Math.min(H*.68,enemy.y));
      if(now>=enemy.nextRoamShot){
        fireCommonEnemyAttack(enemy);enemy.nextRoamShot=now+Math.max(1800,2750-waveDifficultyProgress()*20)/difficultyFactor();
      }
    }
    function fireCommonEnemyAttack(enemy){
      const role=enemyRole(enemy.kind),cx=enemy.x+enemy.w/2,cy=enemy.y+enemy.h,target=nearestLivingPlayer(cx,cy),px=target.x+target.w/2,py=target.y;
      if(role==='miniboss'){
        if(enemy.kind==='miniDreadnought'){for(let side=-2;side<=2;side++)fireEnemy(cx,cy,side*58,165+Math.abs(side)*12,palette.O,10);}
        else if(enemy.kind==='miniCarrier'){for(const ox of [enemy.x+enemy.w*.22,enemy.x+enemy.w*.78])for(let side=-1;side<=1;side++)fireEnemy(ox,cy,side*62,172,palette.R,9);}
        else{const aim=Math.atan2(py-cy,px-cx);for(const spread of [-.16,0,.16])fireEnemy(cx,cy,Math.cos(aim+spread)*460,Math.sin(aim+spread)*460,palette.P,10);}
      }else if(role==='gunship'){for(const spread of [-.18,0,.18])fireEnemy(cx,cy,Math.sin(spread)*155,(145+game.wave*2)*difficultyFactor(),palette.O,10);}
      else if(role==='bomber'){fireEnemy(cx-12,cy,-25,112*difficultyFactor(),palette.R,12);fireEnemy(cx+12,cy,25,112*difficultyFactor(),palette.R,12);}
      else if(role==='interceptor'){const aim=Math.atan2(py-cy,px-cx);fireEnemy(cx,cy,Math.cos(aim)*420,Math.sin(aim)*420,palette.P,8);}
      else fireEnemy(cx,cy,0,(125+game.wave*3)*difficultyFactor(),palette.R,8);
    }
    function hit(a,b){return a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;}
    function segmentIntersectsAabb(x0,y0,x1,y1,left,top,right,bottom){let t0=0,t1=1;for(const [start,delta,min,max] of [[x0,x1-x0,left,right],[y0,y1-y0,top,bottom]]){if(Math.abs(delta)<1e-8){if(start<min||start>max)return false;continue;}let a=(min-start)/delta,b=(max-start)/delta;if(a>b)[a,b]=[b,a];t0=Math.max(t0,a);t1=Math.min(t1,b);if(t0>t1)return false;}return true;}
    function segmentAabbEntry(x0,y0,x1,y1,left,top,right,bottom){
      let entry=0,exit=1;
      for(const [start,delta,min,max] of [[x0,x1-x0,left,right],[y0,y1-y0,top,bottom]]){
        if(Math.abs(delta)<1e-8){if(start<min||start>max)return null;continue;}
        let near=(min-start)/delta,far=(max-start)/delta;if(near>far)[near,far]=[far,near];
        entry=Math.max(entry,near);exit=Math.min(exit,far);if(entry>exit)return null;
      }
      return exit<0||entry>1?null:Math.max(0,entry);
    }
    function projectilesCollide(a,b){if(hit(a,b))return true;const x0=(a.prevX??a.x)+a.w/2-((b.prevX??b.x)+b.w/2),y0=(a.prevY??a.y)+a.h/2-((b.prevY??b.y)+b.h/2),x1=a.x+a.w/2-(b.x+b.w/2),y1=a.y+a.h/2-(b.y+b.h/2),halfW=(a.w+b.w)/2,halfH=(a.h+b.h)/2;return segmentIntersectsAabb(x0,y0,x1,y1,-halfW,-halfH,halfW,halfH);}
    function orientation(ax,ay,bx,by,cx,cy){return(bx-ax)*(cy-ay)-(by-ay)*(cx-ax);}
    function segmentsIntersect(ax,ay,bx,by,cx,cy,dx,dy){const eps=1e-8,o1=orientation(ax,ay,bx,by,cx,cy),o2=orientation(ax,ay,bx,by,dx,dy),o3=orientation(cx,cy,dx,dy,ax,ay),o4=orientation(cx,cy,dx,dy,bx,by),onSegment=(px,py,qx,qy,rx,ry)=>qx>=Math.min(px,rx)-eps&&qx<=Math.max(px,rx)+eps&&qy>=Math.min(py,ry)-eps&&qy<=Math.max(py,ry)+eps;if(((o1>eps&&o2< -eps)||(o1< -eps&&o2>eps))&&((o3>eps&&o4< -eps)||(o3< -eps&&o4>eps)))return true;return(Math.abs(o1)<=eps&&onSegment(ax,ay,cx,cy,bx,by))||(Math.abs(o2)<=eps&&onSegment(ax,ay,dx,dy,bx,by))||(Math.abs(o3)<=eps&&onSegment(cx,cy,ax,ay,dx,dy))||(Math.abs(o4)<=eps&&onSegment(cx,cy,bx,by,dx,dy));}
    function pointSegmentDistanceSquared(px,py,ax,ay,bx,by){const dx=bx-ax,dy=by-ay,length=dx*dx+dy*dy,t=length?Math.max(0,Math.min(1,((px-ax)*dx+(py-ay)*dy)/length)):0,x=ax+t*dx,y=ay+t*dy;return(px-x)**2+(py-y)**2;}
    function projectileCrossesBeam(s,beam){const ax=(s.prevX??s.x)+s.w/2,ay=(s.prevY??s.y)+s.h/2,bx=s.x+s.w/2,by=s.y+s.h/2,radius=5+Math.hypot(s.w,s.h)/2;if(segmentsIntersect(ax,ay,bx,by,beam.x1,beam.y1,beam.x2,beam.y2))return true;const limit=radius*radius;return pointSegmentDistanceSquared(ax,ay,beam.x1,beam.y1,beam.x2,beam.y2)<=limit||pointSegmentDistanceSquared(bx,by,beam.x1,beam.y1,beam.x2,beam.y2)<=limit||pointSegmentDistanceSquared(beam.x1,beam.y1,ax,ay,bx,by)<=limit||pointSegmentDistanceSquared(beam.x2,beam.y2,ax,ay,bx,by)<=limit;}
    function update(dt,now){
      game.backgroundClock+=dt;
      const wasWarping=Boolean(game.warpTransition),warpSpeed=updateBackgroundWarp(dt);
      for(let i=game.explosions.length-1;i>=0;i--){const e=game.explosions[i];e.elapsed+=dt;if(e.elapsed>=.48)game.explosions.splice(i,1);}
      for(let i=game.planetExplosions.length-1;i>=0;i--){const e=game.planetExplosions[i];e.elapsed+=dt;if(e.elapsed>=.6)game.planetExplosions.splice(i,1);}
      const travelScale=1+Math.min(99,Math.max(0,game.wave-1))*.02;
      const farTravelScale=1+Math.max(0,warpSpeed-1)*.25,warpTravelScale=travelScale*warpSpeed;
      updateBackgroundStarLayer(game.farStars,dt,farTravelScale,true);
      updateBackgroundStarLayer(game.stars,dt,warpTravelScale);
      updateBackgroundStarLayer(game.nearStars,dt,warpTravelScale);
      updateBackgroundPlanets(dt);
      if(game.warpTransition?.complete)completeBackgroundWarp();
      updateBlackHoleDebris(dt,wasWarping||Boolean(game.warpTransition));
      for(const r of game.rocks){
        if(r.hp<=0){r.respawn-=dt;if(r.respawn<=0){r.x=Math.random()*W;r.y=-r.r*2;r.hp=1+(Math.random()<.3?1:0);r.dangerous=Math.random()<.42;r.alpha=.52+Math.random()*.3;}continue;}
        r.x+=r.vx*travelScale*dt;r.y+=r.vy*travelScale*dt;r.angle+=r.spin*travelScale*dt;
        if(r.y>H+r.r){r.y=-r.r*2;r.x=Math.random()*W;}if(r.x<-r.r*2)r.x=W+r.r;if(r.x>W+r.r*2)r.x=-r.r;
      }
      if(game.mode!=='play'||wasWarping)return;
      updateLaserState(dt);
      if(game.announcement){game.announcement.elapsed+=dt;if(game.announcement.elapsed>=game.announcement.duration)game.announcement=null;}
      movePlayer(dt);movePlayerTwo(dt);updateAuxiliaryFormation();game.auxiliaryReinforcements=game.auxiliaryReinforcements.filter(entry=>game.auxiliarySlots.includes(entry.id)&&(entry.startedAt===null||now-entry.startedAt<entry.duration));game.waveElapsed+=dt;if(game.specialCooldown>0)game.specialCooldown=Math.max(0,game.specialCooldown-dt);if(game.fighterOverdrive>0)game.fighterOverdrive=Math.max(0,game.fighterOverdrive-dt);if(game.fighterPulse){game.fighterPulse.elapsed+=dt;if(game.fighterPulse.elapsed>=game.fighterPulse.duration)game.fighterPulse=null;}if(game.specialShield){game.specialShield.elapsed+=dt;if(game.specialShield.elapsed>=game.specialShield.duration)endClassSpecial();}
      for(let i=game.blasts.length-1;i>=0;i--){const b=game.blasts[i];b.r+=b.speed*dt;b.life-=dt;if(b.life<=0)game.blasts.splice(i,1);}
      if(now-game.lastSave>15000){saveProgress();game.lastSave=now;}
      if(isMeteorSurvivalWave(game.wave)){
        let activeMeteors=game.rocks.filter(rock=>rock.hp>0).length;
        game.meteorShowerSpawnTimer+=dt;
        while(game.meteorShowerSpawnTimer>=METEOR_SURVIVAL_SPAWN_INTERVAL&&activeMeteors<METEOR_SURVIVAL_MAX_COUNT){
          game.meteorShowerSpawnTimer-=METEOR_SURVIVAL_SPAWN_INTERVAL;
          const inactiveIndex=game.rocks.findIndex(rock=>rock.hp<=0);
          const meteor=createSurvivalMeteor();
          if(inactiveIndex>=0)game.rocks[inactiveIndex]=meteor;else game.rocks.push(meteor);
          activeMeteors++;
        }
        if(activeMeteors>=METEOR_SURVIVAL_MAX_COUNT)game.meteorShowerSpawnTimer=0;
      }else if(game.boss){const b=game.boss;b.phase+=dt;const sway=b.kind==='carrier'?.2:b.kind==='leviathan'?.34:.29;b.x=W/2-b.w/2+Math.sin(b.phase*(b.kind==='leviathan'?1.05:.72))*(W*sway);b.y=(b.kind==='leviathan'?42:54)+Math.sin(b.phase*(b.kind==='carrier'?1.1:1.5))*(b.kind==='leviathan'?25:16);bossAttack(now);updateBossMinibosses(dt,now);}
      else{
        if(game.enemies.length===0&&game.waveGroupIndex<game.waveGroupCount&&game.waveElapsed>=game.waveGroupIndex*15){spawnWaveGroup(game.waveGroupIndex);game.waveGroupIndex++;}
        for(let i=game.enemies.length-1;i>=0;i--){
          const e=game.enemies[i];
          if(e.flyThrough){
            e.x+=e.flyVx*dt;e.y+=e.flyVy*dt;e.phase+=dt*3;e.angle=Math.atan2(e.flyVy,e.flyVx)+Math.PI/2;
            if(e.attackShots>0&&now>=e.nextRaidShot){
              const cx=e.x+e.w/2,cy=e.y+e.h/2,target=nearestLivingPlayer(cx,cy),px=target.x+target.w/2,py=target.y+target.h/2,aim=Math.atan2(py-cy,px-cx);
              fireEnemy(cx,cy,Math.cos(aim)*430,Math.sin(aim)*430,palette.P,9);e.attackShots--;e.nextRaidShot=now+(850+Math.random()*450)/waveAttackMultiplier();
            }
            if(e.x<-e.w-50||e.x>W+50||e.y<-e.h-50||e.y>H+50)game.enemies.splice(i,1);
            continue;
          }
          if(e.entering){
            const dx=e.targetX-e.x,dy=e.targetY-e.y,distance=Math.hypot(dx,dy),step=Math.min(distance,e.entrySpeed*dt);
            if(distance>0){e.x+=dx/distance*step;e.y+=dy/distance*step;e.angle=Math.atan2(dy,dx)+Math.PI/2;}
            if(distance<=step+.5){e.x=e.targetX;e.y=e.targetY;e.entering=false;e.angle=Math.PI;if(e.freeRoaming)e.roamStartAt=now+650+Math.random()*600;}
          }
          if(e.freeRoaming&&!e.entering&&now>=e.roamStartAt){e.roaming=true;moveFreeRoamer(e,dt,now);}
        }
        updateMiniBossEscorts(now);
        const formationEnemies=game.enemies.filter(e=>!e.flyThrough&&!e.roaming);
        const arrived=formationEnemies.length>0&&formationEnemies.every(e=>!e.entering);
        if(arrived&&!game.formationHoldUntil){game.formationHoldUntil=now+1500;game.notice='FROTA INIMIGA EM FORMAÇÃO';game.noticeUntil=now+1500;}
        const patrol=arrived&&now>=game.formationHoldUntil;
        if(patrol){
          let edge=false;const speed=(27+game.wave*3.2)*difficultyFactor();
          for(const e of formationEnemies){
            if(enemyRole(e.kind)==='miniboss'){moveMiniBoss(e,dt,now);continue;}
            const role=enemyRole(e.kind),kindSpeed=role==='interceptor'?1.55:role==='bomber'?.72:role==='gunship'?.84:1;
            e.x+=game.dir*speed*kindSpeed*dt+Math.sin(now*.0008+e.phase)*11*dt;e.y=e.targetY+Math.sin(now*.001+e.phase)*(role==='bomber'?7:2);
            if(e.x<18||e.x+e.w>W-18)edge=true;
          }
          if(edge){game.dir*=-1;for(const e of formationEnemies)if(enemyRole(e.kind)!=='miniboss'){e.x=Math.max(18,Math.min(W-e.w-18,e.x));e.targetY=Math.min(H*.62,e.targetY+16);}}
          if(now-game.lastEnemyShot>Math.max(360,(1900-waveDifficultyProgress()*65)/difficultyFactor())&&formationEnemies.length){
            const mini=formationEnemies.find(enemy=>enemyRole(enemy.kind)==='miniboss'),enemy=mini&&Math.random()<.55?mini:formationEnemies[Math.floor(Math.random()*formationEnemies.length)];
            fireCommonEnemyAttack(enemy);game.lastEnemyShot=now;
          }
        }
      }
      updateContinuousLaser(dt);
      for(const s of game.shots){s.prevX=s.x;s.prevY=s.y;s.x+=s.vx*dt;s.y+=s.vy*dt;if(s.type==='bomb')s.fuse-=dt;}
      for(const s of game.enemyShots){s.prevX=s.x;s.prevY=s.y;s.x+=s.vx*dt;s.y+=s.vy*dt;}
      for(let i=game.shots.length-1;i>=0;i--){const s=game.shots[i],out=s.y+s.h<0||s.y>H+30||s.x<-30||s.x>W+30;if(out){if(s.type==='bomb')explodePlayerBomb(s);game.shots.splice(i,1);continue;}
        let intercepted=false;for(let j=game.enemyShots.length-1;j>=0;j--){const enemyShot=game.enemyShots[j];if(!projectilesCollide(s,enemyShot))continue;game.enemyShots.splice(j,1);if(s.type==='bomb')explodePlayerBomb(s);else burst(s.x+s.w/2,s.y+s.h/2,palette.C,5);game.shots.splice(i,1);intercepted=true;break;}if(intercepted)continue;
        if(s.type==='bomb'){const impact=game.boss&&hit(s,game.boss)||game.enemies.some(e=>hit(s,e));if(impact||s.fuse<=0||s.y+s.h<0){explodePlayerBomb(s);game.shots.splice(i,1);continue;}}
        if(game.boss&&hit(s,game.boss)&&(!s.lance||!s.hitTargets.has(game.boss))){
          if(s.lance){resolveLanceBossHit(s,i);continue;}
          game.boss.hp-=s.dmg;burst(s.x+s.w/2,s.y,palette.Y,3);game.shots.splice(i,1);
          if(game.boss.hp<=0)defeatBoss(game.boss,120,s.owner||1);
          continue;
        }
        let removed=false;
        for(let j=game.enemies.length-1;j>=0;j--){
          const enemy=game.enemies[j];
          if(s.lance&&s.hitTargets.has(enemy))continue;
          if(!hit(s,enemy))continue;
          if(s.lance)resolveLanceHit(s,i,j);
          else{enemy.hp--;if(enemy.hp<=0)killEnemy(j,false,s.owner||1);else burst(s.x,s.y,palette.Y,5);game.shots.splice(i,1);}
          removed=true;break;
        }
        if(removed)continue;
      }
      const activeLaserBeams=game.laserActive?laserSegments():[];
      for(let i=game.enemyShots.length-1;i>=0;i--){const s=game.enemyShots[i];if(s.y>H+30||s.y<-40||s.x<-40||s.x>W+40){game.enemyShots.splice(i,1);continue;}if(activeLaserBeams.some(beam=>projectileCrossesBeam(s,beam))){game.enemyShots.splice(i,1);burst(s.x+s.w/2,s.y,palette.C,4);continue;}if(destroyAuxiliaryOnImpact(s)){game.enemyShots.splice(i,1);continue;}const target=livingPlayers().find(entry=>hit(s,entry.player));if(target){game.enemyShots.splice(i,1);loseLife(s,target.player,target.id);}}
      for(let i=game.enemies.length-1;i>=0;i--){
        const e=game.enemies[i],auxiliary=wingmanPositions().find(({x,y})=>hit(e,{x:x-13,y:y-13,w:26,h:26}));
        if(auxiliary){game.enemies.splice(i,1);spawnExplosion(e.x+e.w/2,e.y+e.h/2,Math.max(42,Math.min(72,Math.max(e.w,e.h)*1.2)));window.SpaceInvadersAudio?.playEnemyDeathSound();burst(e.x+e.w/2,e.y+e.h/2,palette.R,18);destroyAuxiliary(auxiliary);continue;}
        const target=livingPlayers().find(entry=>hit(entry.player,e));if(!target)continue;game.enemies.splice(i,1);spawnExplosion(e.x+e.w/2,e.y+e.h/2,Math.max(42,Math.min(72,Math.max(e.w,e.h)*1.2)));window.SpaceInvadersAudio?.playEnemyDeathSound();burst(e.x+e.w/2,e.y+e.h/2,palette.R,18);loseLife({vx:target.player.x+target.player.w/2-(e.x+e.w/2),vy:target.player.y+target.player.h/2-(e.y+e.h/2)},target.player,target.id);
      }
      if(game.boss){
        const auxiliary=wingmanPositions().find(({x,y})=>hit(game.boss,{x:x-13,y:y-13,w:26,h:26}));
        if(auxiliary)destroyAuxiliary(auxiliary);
        else for(const target of livingPlayers())if(hit(target.player,game.boss))loseLife({vx:0,vy:180},target.player,target.id);
      }
      for(let i=game.shots.length-1;i>=0;i--){
        const shot=game.shots[i],meteor=game.rocks.find(rock=>rock.hp>0&&(!shot.lance||!shot.hitTargets.has(rock))&&projectileHitsMeteor(shot,rock));
        if(!meteor)continue;
        if(shot.lance){resolveLanceMeteorHit(shot,i,meteor);continue;}
        meteor.hp-=shot.dmg||1;if(shot.type==='bomb')explodePlayerBomb(shot);if(meteor.hp<=0)breakMeteor(meteor,shot.owner||1);else burst(meteor.x,meteor.y,palette.Y,4);game.shots.splice(i,1);
      }
      for(const r of game.rocks){
        if(!r.dangerous||r.hp<=0)continue;
        const auxiliary=wingmanPositions().find(({x,y})=>{const left=x-13,top=y-13,nx=Math.max(left,Math.min(r.x,left+26)),ny=Math.max(top,Math.min(r.y,top+26));return Math.hypot(nx-r.x,ny-r.y)<=r.r*1.12;});
        if(auxiliary){r.hp=0;r.dangerous=false;r.respawn=8+Math.random()*5;burst(r.x,r.y,palette.Y,18);destroyAuxiliary(auxiliary);continue;}
        for(const target of livingPlayers()){const p=target.player,nx=Math.max(p.x,Math.min(r.x,p.x+p.w)),ny=Math.max(p.y,Math.min(r.y,p.y+p.h));if(Math.hypot(nx-r.x,ny-r.y)>r.r*1.12)continue;r.hp=0;r.dangerous=false;r.respawn=8+Math.random()*5;burst(r.x,r.y,palette.Y,18);loseLife({vx:r.vx,vy:r.vy},p,target.id);break;}
      }
      for(let i=game.pickups.length-1;i>=0;i--){
        const p=game.pickups[i];
        if(!advancePickup(p,dt)){game.pickups.splice(i,1);continue;}
        const collector=livingPlayers().find(entry=>hit(p,entry.player));if(!collector)continue;

        addPlayerScore(collector.id,150);
        if(p.type==='weapon'&&Number.isInteger(p.weaponIndex)&&p.weaponIndex>=1&&p.weaponIndex<weaponNames.length){
          stopLaser();game.maxWeapon=Math.max(game.maxWeapon,p.weaponIndex);game.weapon=p.weaponIndex;
          if(p.weaponIndex===3)game.laserEnergy=100;
          if(p.weaponIndex===4)game.bombAmmo+=3;
          game.notice=`${weaponNames[p.weaponIndex]} LIBERADA`;
        }else if(p.type==='shield'&&game.shield<3){
          game.shield++;game.notice='ESCUDO +1';
        }else if(p.type==='bomb'&&game.bombs<3){
          game.bombs++;game.notice='BOMBA +1';
        }else if(p.type==='laserAmmo'){
          game.laserEnergy=Math.min(100,game.laserEnergy+35);game.notice='CARGA DO LASER +35%';
        }else if(p.type==='bombAmmo'){
          game.bombAmmo+=3;game.notice='BOMBAS +3 CARGAS';
        }else if(p.type==='wingman'&&addAuxiliary()){
          game.notice=`AUXILIAR ${game.auxiliaries}/${auxiliaryCap()} ADICIONADO`;
        }else if(p.type==='power'){
          if(game.weapon===3){game.laserEnergy=Math.min(100,game.laserEnergy+35);game.notice='CARGA DO LASER +35%';}
          else if(game.weapon===4){game.bombAmmo+=3;game.notice='BOMBAS +3 CARGAS';}
          else{game.power=game.powerMax;game.notice='DISPARO RÁPIDO ATIVADO';}
        }else{
          game.power=game.powerMax;game.notice='DISPARO RÁPIDO ATIVADO';
        }

        window.SpaceInvadersAudio?.playUpgradeSound();
        game.noticeUntil=performance.now()+1800;game.pickups.splice(i,1);updateHud();saveProgress();
      }
      if(game.beam){
        const beam=game.beam;if(beam.source==='boss'&&game.boss)beam.x=game.boss.x+game.boss.w/2;beam.time+=dt;
        const active=beam.time>beam.warn,hitWidth=beam.ultimate?13:19,originY=game.boss?game.boss.y+game.boss.h-4:50;
        if(active){
          const auxiliary=wingmanPositions().find(({x,y})=>y+13>=originY&&(beam.rays||[0]).some(offset=>Math.abs(x-(beam.x+offset))<hitWidth));
          if(auxiliary)destroyAuxiliary(auxiliary);
          else for(const target of livingPlayers())if((beam.rays||[0]).some(offset=>Math.abs(target.player.x+target.player.w/2-(beam.x+offset))<hitWidth))loseLife({vx:0,vy:240},target.player,target.id);
        }
        if(beam.time>beam.warn+beam.active)game.beam=null;
      }
      if(game.boss){const pct=Math.max(0,game.boss.hp/game.boss.max);ui.bossHp.style.width=`${pct*100}%`;ui.bossHpLabel.textContent=`${Math.ceil(pct*100)}%`;}
      for(let i=game.particles.length-1;i>=0;i--){const p=game.particles[i];p.x+=p.vx*dt;p.y+=p.vy*dt;p.life-=dt;if(p.life<=0)game.particles.splice(i,1);}
      if(game.transition>0){game.transition-=dt;if(game.transition<=0)startNextWave();}
      else if(game.mode==='play'&&!game.warpTransition&&isMeteorSurvivalWave(game.wave)&&game.meteorSurvivalRemaining>0){
        game.meteorSurvivalRemaining=Math.max(0,game.meteorSurvivalRemaining-dt);
        if(game.meteorSurvivalRemaining<=0){game.meteorSurvivalComplete=true;game.transition=.8;game.notice='FASE DE SOBREVIVÊNCIA CONCLUÍDA';game.noticeUntil=performance.now()+1800;}
      }else if(!isMeteorSurvivalWave(game.wave)&&!game.warpTransition&&!game.boss&&game.enemies.length===0&&game.waveGroupIndex>=game.waveGroupCount&&game.waveElapsed>=55)game.transition=.8;
    }
    function projectileHitsMeteor(s,r){const nx=Math.max(s.x,Math.min(r.x,s.x+s.w)),ny=Math.max(s.y,Math.min(r.y,s.y+s.h));return Math.hypot(nx-r.x,ny-r.y)<=r.r*1.12;}
    function breakMeteor(r,playerId=1){if(r.respawn>0)return;r.hp=0;r.dangerous=false;r.respawn=8+Math.random()*5;addPlayerScore(playerId,20);spawnExplosion(r.x,r.y,38);burst(r.x,r.y,palette.Y,16);updateHud();}
    function drawRock(r){
      if(!meteorSheet.complete||!meteorSheet.naturalWidth)return;
      ctx.save();ctx.globalAlpha=r.alpha;ctx.imageSmoothingEnabled=false;ctx.translate(r.x,r.y);ctx.rotate(r.angle);
      const sx=(r.sprite%4)*64,sy=Math.floor(r.sprite/4)*64,size=r.r*2.25;ctx.drawImage(meteorSheet,sx,sy,64,64,-size/2,-size/2,size,size);ctx.restore();
    }
    function drawPickup(p){
      const weaponGlyphs=['P','F','T','L','B'],weaponColors=['#55ff9a','#f2d879','#ff9b72','#64e8ff','#ff6671'];
      const glyph=p.type==='weapon'?weaponGlyphs[p.weaponIndex]||'?':p.type==='power'?weaponGlyphs[game.weapon]||'P':p.type==='wingman'?'A':p.type==='laserAmmo'?'L':p.type==='bombAmmo'?'B':p.type==='shield'?'S':p.type==='bomb'?'X':'?';
      const color=p.type==='weapon'?weaponColors[p.weaponIndex]||'#55ff9a':p.type==='laserAmmo'||(p.type==='power'&&game.weapon===3)?'#64e8ff':p.type==='bombAmmo'||p.type==='bomb'||(p.type==='power'&&game.weapon===4)?'#ff6671':p.type==='power'&&game.weapon===1?'#f2d879':p.type==='wingman'?'#fff':p.type==='shield'?'#b8e4ff':'#55ff9a';
      ctx.fillStyle='#55ff9a';ctx.shadowColor=color;ctx.shadowBlur=8;ctx.fillRect(p.x,p.y,p.w,p.h);ctx.shadowBlur=0;ctx.fillStyle='#07101c';ctx.fillRect(p.x+3,p.y+3,p.w-6,p.h-6);ctx.fillStyle=color;ctx.font='bold 10px monospace';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(glyph,p.x+p.w/2,p.y+p.h/2);ctx.textBaseline='alphabetic';
    }
    function drawBackgroundPlanets(){
      for(const planets of [backgroundPlanets,incomingBackgroundPlanets]){
        for(const planet of planets){
          const sprite=planet.asset.texture;if(!planet.asset.ready||!sprite)continue;
          const width=planet.size,height=width*sprite.height/sprite.width;
          ctx.save();ctx.globalAlpha=planet.alpha;ctx.imageSmoothingEnabled=false;
          ctx.drawImage(sprite,planet.x-width/2,planet.y-height/2,width,height);ctx.restore();
        }
      }
    }
    function drawBackgroundMeteors(){
      ctx.save();ctx.imageSmoothingEnabled=false;
      for(const meteor of backgroundMeteors){
        ctx.globalAlpha=meteor.alpha;
        if(backgroundMeteorSprite){
          const spriteSize=meteor.length*1.1;
          ctx.save();ctx.translate(meteor.x,meteor.y);ctx.rotate(Math.atan2(meteor.vy,meteor.vx)-Math.PI*3/4);
          ctx.drawImage(backgroundMeteorSprite,-spriteSize/2,-spriteSize/2,spriteSize,spriteSize);ctx.restore();
        }else if(meteorSheet.complete&&meteorSheet.naturalWidth){
          const spriteSize=meteor.size*7;
          ctx.save();ctx.translate(meteor.x,meteor.y);ctx.rotate(Math.atan2(meteor.vy,meteor.vx));
          ctx.drawImage(meteorSheet,(meteor.sprite%4)*64,Math.floor(meteor.sprite/4)*64,64,64,-spriteSize/2,-spriteSize/2,spriteSize,spriteSize);ctx.restore();
        }
      }
      ctx.restore();
    }
    function drawPlanetExplosions(){
      if(!explosionSheet.complete||!explosionSheet.naturalWidth)return;
      const frameWidth=explosionSheet.naturalWidth/4,frameHeight=explosionSheet.naturalHeight/2;
      ctx.save();ctx.imageSmoothingEnabled=false;
      for(const explosion of game.planetExplosions){
        const progress=explosion.elapsed/.6,frame=Math.min(7,Math.floor(explosion.elapsed/.075));
        ctx.globalAlpha=Math.max(0,1-progress);ctx.shadowColor='#ffb84d';ctx.shadowBlur=20*(1-progress);
        ctx.drawImage(explosionSheet,(frame%4)*frameWidth,Math.floor(frame/4)*frameHeight,frameWidth,frameHeight,explosion.x-explosion.size/2,explosion.y-explosion.size/2,explosion.size,explosion.size);
        const artwork=backgroundExplosionArt[Math.min(2,Math.floor(explosion.elapsed/.2))]?.texture;
        if(artwork){
          const artworkSize=explosion.size*1.2;
          ctx.globalAlpha=.82*(1-progress);ctx.shadowBlur=0;
          ctx.drawImage(artwork,explosion.x-artworkSize/2,explosion.y-artworkSize/2,artworkSize,artworkSize);
        }
        ctx.shadowBlur=0;ctx.strokeStyle=`rgba(255,184,77,${Math.max(0,.65*(1-progress))})`;ctx.lineWidth=2;
        ctx.beginPath();ctx.arc(explosion.x,explosion.y,explosion.size*(.3+progress*.32),0,Math.PI*2);ctx.stroke();
      }
      ctx.restore();
    }
    function drawStarLayer(stars,color,streaks=false){
      for(const star of stars){
        ctx.globalAlpha=star.a;
        if(streaks&&star.streak>=2){
          ctx.strokeStyle=color;ctx.lineWidth=star.s;ctx.lineCap='round';ctx.beginPath();
          ctx.moveTo(Math.round(star.x),Math.round(star.y));ctx.lineTo(Math.round(star.x),Math.round(star.y-star.streak));ctx.stroke();
        }else{ctx.fillStyle=color;ctx.fillRect(Math.round(star.x),Math.round(star.y),star.s,star.s);}
      }
      ctx.globalAlpha=1;
    }
    function drawBackgroundStars(){
      ctx.save();drawStarLayer(game.farStars,'#8290a7');drawStarLayer(game.stars,'#c8d5e8',true);drawStarLayer(game.nearStars,'#f3f7ff',true);ctx.restore();
    }
    function drawSpecialShield(){
      const p=game.player,cx=p.x+p.w/2,cy=p.y+p.h/2;
      if(specialClass()==='fighter'&&game.fighterOverdrive>0){ctx.save();ctx.globalAlpha=.56+.28*Math.sin(performance.now()/55);ctx.strokeStyle='#45d8ff';ctx.lineWidth=2;ctx.beginPath();ctx.arc(cx,cy,30+Math.sin(performance.now()/70)*4,0,Math.PI*2);ctx.stroke();ctx.beginPath();ctx.moveTo(cx-12,cy+22);ctx.lineTo(cx-20,cy+35);ctx.moveTo(cx+12,cy+22);ctx.lineTo(cx+20,cy+35);ctx.stroke();ctx.restore();}
      const shield=game.specialShield;if(!shield)return;const tank=shield.kind==='tank',radius=tank?39:33,color=tank?'#ffb743':'#58eaff';
      ctx.save();ctx.globalAlpha=.72+.2*Math.sin(performance.now()/90);ctx.strokeStyle=color;ctx.lineWidth=tank?4:3;ctx.setLineDash(tank?[]:[4,4]);ctx.beginPath();ctx.arc(cx,cy,radius,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);
      for(let i=0;i<shield.maxHp;i++){const a=-Math.PI/2+i*Math.PI*2/shield.maxHp;ctx.fillStyle=i<shield.hp?color:'#27343a';ctx.fillRect(Math.round(cx+Math.cos(a)*(radius+7)-2),Math.round(cy+Math.sin(a)*(radius+7)-2),4,4);}
      ctx.restore();
    }
    function drawAuxiliaryReinforcement(auxiliary){
      if(auxiliary.arrivalProgress===undefined)return;
      const fade=1-auxiliary.arrivalProgress,length=8+fade*11;
      ctx.save();ctx.globalAlpha=.35+fade*.65;ctx.shadowColor='#65e8ff';ctx.shadowBlur=10;
      const plume=ctx.createLinearGradient(auxiliary.x,auxiliary.y-7,auxiliary.x,auxiliary.y-7-length);
      plume.addColorStop(0,'rgba(220,255,255,.95)');plume.addColorStop(.45,'rgba(69,216,255,.75)');plume.addColorStop(1,'rgba(69,216,255,0)');
      ctx.fillStyle=plume;ctx.beginPath();ctx.moveTo(auxiliary.x-3,auxiliary.y-7);ctx.lineTo(auxiliary.x,auxiliary.y-7-length);ctx.lineTo(auxiliary.x+3,auxiliary.y-7);ctx.closePath();ctx.fill();ctx.restore();
    }
    function drawFighterPulse(){
      const pulse=game.fighterPulse;if(!pulse)return;
      const progress=pulse.elapsed/pulse.duration,reach=270*(.35+.65*progress),width=48+90*progress;
      ctx.save();ctx.globalAlpha=(1-progress)*.62;ctx.fillStyle='#45d8ff';ctx.strokeStyle='#c8f8ff';ctx.lineWidth=3;ctx.shadowColor='#45d8ff';ctx.shadowBlur=24;
      ctx.beginPath();ctx.moveTo(pulse.x-12,pulse.y);ctx.lineTo(pulse.x-width/2,pulse.y-reach);ctx.lineTo(pulse.x+width/2,pulse.y-reach);ctx.lineTo(pulse.x+12,pulse.y);ctx.closePath();ctx.fill();ctx.stroke();ctx.restore();
    }
    function drawPlayerActor(player,playerId){
      if(!player.active)return;
      if(player.invuln<=0||Math.floor(performance.now()/90)%2===0){
        if(playerId===1&&game.shield>0){ctx.strokeStyle='#55ff9a99';ctx.lineWidth=3;ctx.beginPath();ctx.arc(player.x+player.w/2,player.y+player.h/2,25+Math.sin(performance.now()/90)*2,0,Math.PI*2);ctx.stroke();}
        if(playerId===1){for(const auxiliary of wingmanPositions()){drawAuxiliaryReinforcement(auxiliary);drawHero(auxiliary.x-13,auxiliary.y-13,26,26);}}
        if(playerId===2){ctx.save();ctx.strokeStyle='#ffcc66';ctx.lineWidth=2;ctx.globalAlpha=.9;ctx.beginPath();ctx.arc(player.x+player.w/2,player.y+player.h/2,27,0,Math.PI*2);ctx.stroke();ctx.restore();}
        drawHero(player.x+player.w/2-22,player.y+player.h/2-22,44,44,player);
      }
    }
    function drawAnnouncement(){
      const announcement=game.announcement;if(!announcement||game.mode!=='play')return;
      const progress=Math.max(0,Math.min(1,announcement.elapsed/announcement.duration));
      const fade=Math.min(1,announcement.elapsed/.24,(1-progress)*5);
      const scale=.9+Math.min(1,announcement.elapsed/.24)*.1;
      const victory=announcement.kind==='victory',color=victory?'#ffcc66':'#e7e9ec',accent=victory?'#ff4654':'#55ff9a';
      ctx.save();ctx.translate(W/2,H/2);ctx.scale(scale,scale);ctx.globalAlpha=Math.max(0,fade);
      ctx.font=`bold ${victory?30:25}px monospace`;ctx.textAlign='center';ctx.textBaseline='middle';
      const width=Math.min(W-48,ctx.measureText(announcement.text).width+64),height=82;
      ctx.shadowColor=accent;ctx.shadowBlur=22;ctx.fillStyle='#050912eF';
      if(typeof ctx.roundRect==='function'){ctx.beginPath();ctx.roundRect(-width/2,-height/2,width,height,8);ctx.fill();}
      else ctx.fillRect(-width/2,-height/2,width,height);
      ctx.shadowBlur=0;ctx.strokeStyle=accent;ctx.lineWidth=2;ctx.strokeRect(-width/2,-height/2,width,height);
      ctx.fillStyle=accent;ctx.fillRect(-width/2+12,-height/2+12,4,height-24);ctx.fillRect(width/2-16,-height/2+12,4,height-24);
      ctx.fillStyle=color;ctx.shadowColor=accent;ctx.shadowBlur=12;ctx.fillText(announcement.text,0,1, width-38);
      ctx.restore();
    }
    function aimCursor(){
      const player=game.player,cx=player.x+player.w/2,cy=player.y+player.h/2;
      if(game.aimMode==='free'&&game.mouseAimActive&&game.aimSource==='mouse')return{x:game.mouseAimX,y:game.mouseAimY,originX:cx,originY:cy};
      const aimInput=activeAimInput(),dx=aimInput.aimX,dy=aimInput.aimY,margin=12;
      let distance=235;
      if(dx>0)distance=Math.min(distance,(W-margin-cx)/dx);else if(dx<0)distance=Math.min(distance,(margin-cx)/dx);
      if(dy>0)distance=Math.min(distance,(H-margin-cy)/dy);else if(dy<0)distance=Math.min(distance,(margin-cy)/dy);
      distance=Math.max(0,distance);return{x:cx+dx*distance,y:cy+dy*distance,originX:cx,originY:cy};
    }
    function drawAimCursor(){
      const mouseAim=game.aimMode==='free'&&game.mouseAimActive&&game.aimSource==='mouse',controllerAim=game.aimMode==='free'&&gamepadInput.connected&&gamepadInput.aimActive&&game.aimSource!=='mouse';
      if((!mouseAim&&!controllerAim)||game.mode!=='play'||!game.player.active)return;
      const cursor=aimCursor();ctx.save();
      ctx.globalAlpha=.9;ctx.strokeStyle='#9bf5ff';ctx.fillStyle='#d9fcff';ctx.shadowColor='#68f1ff';ctx.shadowBlur=12;ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(cursor.x,cursor.y,11,0,Math.PI*2);ctx.stroke();
      ctx.beginPath();ctx.moveTo(cursor.x-17,cursor.y);ctx.lineTo(cursor.x-7,cursor.y);ctx.moveTo(cursor.x+7,cursor.y);ctx.lineTo(cursor.x+17,cursor.y);ctx.moveTo(cursor.x,cursor.y-17);ctx.lineTo(cursor.x,cursor.y-7);ctx.moveTo(cursor.x,cursor.y+7);ctx.lineTo(cursor.x,cursor.y+17);ctx.stroke();ctx.beginPath();ctx.arc(cursor.x,cursor.y,2,0,Math.PI*2);ctx.fill();ctx.restore();
    }
    function drawMeteorSurvivalTimer(){
      if(game.mode!=='play'||!isMeteorSurvivalWave(game.wave)||game.warpTransition)return;
      const seconds=Math.ceil(Math.max(0,game.meteorSurvivalRemaining)),label=`SOBREVIVA · ${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`,timerY=H*.25;
      ctx.save();ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='bold 19px monospace';ctx.shadowColor='#55ff9a';ctx.shadowBlur=12;
      ctx.fillStyle='#06101be8';ctx.fillRect(W/2-145,timerY-19,290,38);ctx.strokeStyle='#55ff9a';ctx.lineWidth=1.5;ctx.strokeRect(W/2-145,timerY-19,290,38);
      ctx.fillStyle='#e7e9ec';ctx.fillText(label,W/2,timerY);ctx.restore();
    }
    function render(){
      ctx.clearRect(0,0,W,H);
      drawBackgroundStars();drawBackgroundPlanets();drawBackgroundMeteors();drawPlanetExplosions();
      for(const r of game.rocks)if(r.hp>0)drawRock(r);
      drawExplosions();
      if(game.mode!=='title'){
        ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';
        drawFighterPulse();drawPlayerActor(game.player,1);drawPlayerActor(game.player2,2);if(game.player.active)drawSpecialShield();
        const renderActors=game.enemies.map(enemy=>({entity:enemy,layer:enemy.renderLayer??(enemy.bossCompanion?RENDER_LAYER.bossCompanion:RENDER_LAYER.enemy)}));
        if(game.boss)renderActors.push({entity:game.boss,layer:RENDER_LAYER.boss,mainBoss:true});
        renderActors.sort((a,b)=>a.layer-b.layer);
        for(const {entity,mainBoss} of renderActors){
          if(mainBoss){drawBossArt(entity.kind,entity.x,entity.y,entity.w,entity.h);for(let i=0;i<3;i++){ctx.fillStyle=i===1?palette.C:palette.R;ctx.fillRect(entity.x+entity.w*.18+i*entity.w*.32,entity.y+entity.h-8,18,8);}}
          else drawEnemyArt(entity.kind,entity.x-3,entity.y-4,entity.w+6,entity.h+8,entity.angle??Math.PI);
        }
        for(const s of game.shots){const drawW=s.drawW??s.w,drawH=s.drawH??s.h;ctx.save();ctx.translate(s.x+s.w/2,s.y+s.h/2);if(Number.isFinite(s.angle))ctx.rotate(s.angle);ctx.fillStyle=s.color;ctx.shadowColor=s.color;ctx.shadowBlur=s.type==='bomb'?12:s.laser?18:8;if(s.type==='bomb'){ctx.beginPath();ctx.ellipse(0,0,drawW/2,drawH/2,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#fff3d0';ctx.fillRect(-1,-drawH/2,2,4);}else{ctx.fillRect(-drawW/2,-drawH/2,drawW,drawH);if(!s.laser){ctx.fillStyle='#fff';ctx.fillRect(-drawW/6,-drawH/2,Math.max(2,drawW/3),drawH*.55);}}ctx.restore();}
        for(const s of game.enemyShots){ctx.fillStyle=s.color;ctx.shadowColor=s.color;ctx.shadowBlur=10;ctx.fillRect(Math.round(s.x),Math.round(s.y),s.w,s.h);ctx.shadowBlur=0;ctx.fillStyle='#fff9';ctx.fillRect(s.x+s.w*.35,s.y+2,Math.max(2,s.w*.25),Math.max(3,s.h*.4));}
        if(game.laserActive){for(const beam of laserSegments()){const gradient=ctx.createLinearGradient(beam.x1,beam.y1,beam.x2,beam.y2);gradient.addColorStop(0,'#f1ffff');gradient.addColorStop(.25,'#64e8ffbd');gradient.addColorStop(1,'#54eaff44');ctx.save();ctx.lineCap='round';ctx.strokeStyle=gradient;ctx.shadowColor='#64e8ff';ctx.shadowBlur=12;ctx.lineWidth=6;ctx.beginPath();ctx.moveTo(beam.x1,beam.y1);ctx.lineTo(beam.x2,beam.y2);ctx.stroke();ctx.strokeStyle='#f1ffff';ctx.shadowBlur=0;ctx.lineWidth=2;ctx.stroke();ctx.restore();}}
        for(const p of game.pickups)drawPickup(p);
        if(game.beam){const b=game.beam,active=b.time>b.warn,originY=game.boss?game.boss.y+game.boss.h-4:50;ctx.save();ctx.globalAlpha=active?.78:.4;ctx.strokeStyle=active?palette.R:'#ffb3bd';ctx.shadowColor=palette.R;ctx.shadowBlur=active?26:8;for(const offset of b.rays||[0]){ctx.lineWidth=active?(b.ultimate?9:14):2;ctx.beginPath();ctx.moveTo(b.x+offset,originY);ctx.lineTo(b.x+offset,H);ctx.stroke();if(active&&!b.ultimate){ctx.strokeStyle='#fff4f5';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(b.x+offset,originY);ctx.lineTo(b.x+offset,H);ctx.stroke();ctx.strokeStyle=palette.R;}}ctx.restore();}
      }
      for(const b of game.blasts){ctx.save();ctx.globalAlpha=Math.max(0,b.life/b.maxLife);ctx.strokeStyle=b.color||palette.C;ctx.lineWidth=4;ctx.shadowColor=b.color||palette.C;ctx.shadowBlur=18;ctx.beginPath();ctx.arc(b.x,b.y,b.r,0,Math.PI*2);ctx.stroke();ctx.lineWidth=1;ctx.strokeStyle='#e7e9ec';ctx.beginPath();ctx.arc(b.x,b.y,b.r*.94,0,Math.PI*2);ctx.stroke();ctx.restore();}
      for(const p of game.particles){ctx.globalAlpha=Math.min(1,p.life*2);ctx.fillStyle=p.color;ctx.fillRect(p.x,p.y,p.size,p.size);}ctx.globalAlpha=1;
      if(game.mode==='play'&&game.transition>0){ctx.fillStyle='#e7e9ec';ctx.textAlign='center';ctx.font='bold 28px monospace';ctx.fillText(game.meteorSurvivalComplete?'FASE DE SOBREVIVÊNCIA CONCLUÍDA':game.boss?'SETOR LIMPO':'SETOR CONCLUÍDO',W/2,H/2);}
      if(game.mode==='play'&&game.warpTransition){ctx.fillStyle='#e7e9ec';ctx.textAlign='center';ctx.font='bold 22px monospace';ctx.fillText('AVANÇO PARA NOVO SISTEMA',W/2,H/2);}
      if(game.mode==='play'&&game.notice&&performance.now()<game.noticeUntil){ctx.fillStyle='#55ff9a';ctx.textAlign='center';ctx.font='bold 18px monospace';ctx.shadowColor='#55ff9a';ctx.shadowBlur=12;ctx.fillText(game.notice,W/2,H*.72);ctx.shadowBlur=0;}
      drawAnnouncement();drawMeteorSurvivalTimer();
      drawAimCursor();
    }
    let gameLoopRequest=0;
    function frame(now){gameLoopRequest=0;if(ui.gameView.hidden)return;const dt=Math.min(.035,(now-game.lastFrame)/1000||0);game.lastFrame=now;pollGamepad();update(dt,now);render();if(!ui.gameView.hidden&&game.mode!=='credits')gameLoopRequest=requestAnimationFrame(frame);}
    let menuGamepadRequest=0;
    function pollStartMenuGamepad(){
      menuGamepadRequest=0;const startMenuActive=!ui.startMenu.hidden&&game.mode==='title',creditsActive=!ui.gameView.hidden&&!ui.credits.hidden&&game.mode==='credits';if(!startMenuActive&&!creditsActive)return;
      pollGamepad();menuGamepadRequest=requestAnimationFrame(pollStartMenuGamepad);
    }
    function startMenuGamepadLoop(){const startMenuActive=!ui.startMenu.hidden&&game.mode==='title',creditsActive=!ui.gameView.hidden&&!ui.credits.hidden&&game.mode==='credits';if(!menuGamepadRequest&&(startMenuActive||creditsActive))menuGamepadRequest=requestAnimationFrame(pollStartMenuGamepad);}
    function startGameLoop(){if(!gameLoopRequest&&!ui.gameView.hidden)gameLoopRequest=requestAnimationFrame(frame);}
    function stopGameLoop(){if(gameLoopRequest)cancelAnimationFrame(gameLoopRequest);gameLoopRequest=0;}
    function openMainMenu(){refreshContinue();setMenuView('menuMain','menu');}
    function openStageSelect(){
      if(!ENABLE_STAGE_SELECT)return;
      refreshStageSelect();
      setMenuView('menuStageSelect','pause');
    }
    function closeStageSelect(){setMenuView('menuPause','pause');}
    function openRanking(){saveHighScore();document.getElementById('rankingHighScore').textContent=String(game.high).padStart(6,'0');setMenuView('menuRanking','pause');}
    function returnToHome(){if(game.mode==='credits'){try{localStorage.removeItem('cg-space-v2-save');localStorage.removeItem('cg-space-v2-checkpoint');}catch{}refreshContinue();}setCreditsBackgroundInert(false);stopGameLoop();game.mode='title';ui.credits.hidden=true;ui.overlay.hidden=true;ui.playHud.hidden=true;ui.gameView.classList.remove('is-playing');ui.gameView.hidden=true;ui.startMenu.hidden=false;if(document.fullscreenElement)document.exitFullscreen()?.catch(()=>{});document.dispatchEvent(new CustomEvent('space-invaders:return-home'));}
    function openSettings(){game.settingsReturn=game.mode==='pause'?'menuPause':'menuMain';game.settingsReturnMode=game.mode==='pause'?'pause':'menu';setMenuView('menuSettings','settings');}
    function openSkins(){game.settingsReturn='menuMain';game.settingsReturnMode='menu';setMenuView('menuSkins','skins');document.querySelectorAll('.skin-choice').forEach(b=>b.classList.toggle('active',Number(b.dataset.skin)===game.skin));}
    function pauseGame(){if(game.mode!=='play')return;stopLaser();stopLaserSound();updateHud();saveProgress();game.mode='pause';setMenuView('menuPause','pause');}
    function resumeGame(){if(game.mode==='settings'&&game.settingsReturnMode==='pause'){game.mode='play';ui.overlay.hidden=true;}else if(game.mode==='pause'){game.mode='play';ui.overlay.hidden=true;}else return;try{canvas.focus({preventScroll:true});}catch{canvas.focus();}}
    function resetStageProgress(){
      if(!window.confirm('Resetar todo o progresso salvo e reiniciar no estágio 1?'))return;
      try{
        localStorage.removeItem('cg-space-v2-save');localStorage.removeItem('cg-space-v2-checkpoint');localStorage.setItem(MAX_WAVE_KEY,'1');
      }catch(error){
        console.error('Não foi possível resetar o progresso.',error);
        const summary=document.getElementById('stageProgressSummary');
        if(summary)summary.textContent='Não foi possível resetar o progresso salvo.';
        return;
      }
      game.maxWaveReached=1;refreshContinue();refreshStageSelect();startGame(false,1);
    }
    async function toggleFullscreen(){try{if(!document.fullscreenElement)await document.querySelector('.arcade').requestFullscreen();else await document.exitFullscreen();}catch{}}
    document.getElementById('newGameBtn').addEventListener('click',()=>startGame(false));
    ui.continueBtn.addEventListener('click',()=>startGame(true));
    document.getElementById('stageSelectPauseBtn').addEventListener('click',openStageSelect);
    document.getElementById('stageSelectBackBtn').addEventListener('click',closeStageSelect);
    document.getElementById('resetStageProgressBtn').addEventListener('click',resetStageProgress);
    ui.stageSelectGrid.addEventListener('click',event=>{const button=event.target.closest('button[data-stage]');if(!button||button.disabled)return;const stage=Number(button.dataset.stage);if(Number.isInteger(stage)&&stage>=1&&stage<=game.maxWaveReached&&stage<=MAX_WAVE)startGame(false,stage);});
    document.getElementById('tutorialBtn').addEventListener('click',()=>setMenuView('menuTutorial','menu'));
    document.getElementById('overviewBtn').addEventListener('click',()=>setMenuView('menuOverview','menu'));
    document.getElementById('controlsBtn').addEventListener('click',()=>setMenuView('menuControls','menu'));
    document.getElementById('tutorialBackBtn').addEventListener('click',openMainMenu);
    document.getElementById('overviewBackBtn').addEventListener('click',openMainMenu);
    document.getElementById('controlsBackBtn').addEventListener('click',openMainMenu);
    document.getElementById('settingsBtn').addEventListener('click',openSettings);
    document.getElementById('pauseSettingsBtn').addEventListener('click',openSettings);
    document.getElementById('skinsBtn').addEventListener('click',openSkins);
    document.getElementById('resumeBtn').addEventListener('click',resumeGame);
    document.getElementById('saveCheckpointBtn').addEventListener('click',()=>showCheckpointFeedback(saveCheckpoint()));
    document.getElementById('pauseRankingBtn').addEventListener('click',openRanking);
    document.getElementById('rankingBackBtn').addEventListener('click',()=>setMenuView('menuPause','pause'));
    document.getElementById('restartGameBtn').addEventListener('click',()=>startGame(false));
    document.getElementById('homeBtn').addEventListener('click',returnToHome);
    document.getElementById('settingsBackBtn').addEventListener('click',()=>{applySettings();setMenuView(game.settingsReturn,game.settingsReturnMode);});
    document.getElementById('skinsBackBtn').addEventListener('click',openMainMenu);
    document.getElementById('retryBtn').addEventListener('click',retryFromCheckpoint);
    document.getElementById('gameOverMenuBtn').addEventListener('click',openMainMenu);
    document.getElementById('creditsReplayBtn').addEventListener('click',replayFromCredits);
    document.getElementById('creditsMenuBtn').addEventListener('click',returnToHome);
    document.querySelectorAll('.skin-choice').forEach(button=>button.addEventListener('click',()=>{game.skin=Number(button.dataset.skin);try{localStorage.setItem('cg-space-v2-skin',String(game.skin));}catch{}document.querySelectorAll('.skin-choice').forEach(b=>b.classList.toggle('active',b===button));}));
    ui.difficulty.addEventListener('change',applySettings);ui.aimMode.addEventListener('change',applySettings);ui.movementKeys.addEventListener('change',applySettings);ui.particles.addEventListener('change',applySettings);ui.hudToggles.forEach(check=>check.addEventListener('change',applySettings));
    ui.full.addEventListener('click',toggleFullscreen);document.getElementById('settingsFullscreenBtn').addEventListener('click',toggleFullscreen);
    document.addEventListener('fullscreenchange',resizeCanvas);
    ui.restart.addEventListener('click',()=>startGame(false));
    window.addEventListener('keydown',e=>{
      const key=e.key.toLowerCase();
      if(!e.repeat&&(key==='p'||key==='escape')&&(['play','pause'].includes(game.mode)||(game.mode==='settings'&&game.settingsReturnMode==='pause'))){e.preventDefault();if(game.mode==='play')pauseGame();else resumeGame();return;}
      if(e.code==='Numpad0'){if(game.mode==='play'){e.preventDefault();if(game.player2.active)game.keys.add('numpad0');}return;}
      if(!e.repeat&&game.mode==='play'&&!game.player2.active&&(key==='enter'||e.code==='NumpadEnter')){e.preventDefault();joinPlayerTwo();return;}
      const fireKey=e.key===' '||e.key==='Space';if(fireKey&&game.mode==='play'&&game.weapon===3){e.preventDefault();game.keys.add(' ');return;}
      if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown',' ','Space'].includes(e.key))e.preventDefault();game.keys.add(key);
      if(!e.repeat&&key==='x')useBomb();if(!e.repeat&&key==='c')activateClassSpecial();
      if(key==='z'&&game.mode==='play'){game.weapon=(game.weapon+1)%(game.maxWeapon+1);if(game.weapon!==3)stopLaser();updateHud();}
      if(e.key==='Enter'&&!ui.gameView.hidden&&(game.mode==='menu'||game.mode==='over'))startGame(false);
    });
    ui.bombButton.addEventListener('click',useBomb);
    ui.specialButton.addEventListener('click',activateClassSpecial);
    ui.player2StartBtn.addEventListener('click',joinPlayerTwo);
    window.addEventListener('gamepadconnected',event=>{gamepadInput.index=event.gamepad.index;gamepadInput.connected=true;gamepadInput.previousButtons=Array(16).fill(false);gamepadInput.previousTrigger=false;gamepadInput.aimX=0;gamepadInput.aimY=-1;gamepadInput.aimActive=true;if(!game.mouseAimActive)game.aimSource='gamepad';game.notice='CONTROLE CONECTADO';game.noticeUntil=performance.now()+1800;});
    window.addEventListener('gamepaddisconnected',event=>{if(gamepadInput.index!==event.gamepad.index)return;releaseGamepadInput();gamepadInput.connected=false;gamepadInput.index=null;game.notice='CONTROLE DESCONECTADO';game.noticeUntil=performance.now()+1800;});
    window.addEventListener('keyup',e=>{const key=e.key.toLowerCase();game.keys.delete(key);if(e.code==='Numpad0'){game.keys.delete('numpad0');window.SpaceInvadersAudio?.stopEffect('blaster');}else if(e.code==='Space'||key===' '){window.SpaceInvadersAudio?.stopEffect('blaster');}});
    function updatePointerPosition(e){
      const rect=canvas.getBoundingClientRect(),x=Math.max(0,Math.min(W,(e.clientX-rect.left)*W/rect.width)),y=Math.max(0,Math.min(H,(e.clientY-rect.top)*H/rect.height));
      game.pointerX=x;game.pointerY=y;
      if(e.pointerType!=='touch'&&game.mode==='play'){game.mouseAimX=x;game.mouseAimY=y;game.mouseAimActive=true;game.aimSource='mouse';}
    }
    window.addEventListener('blur',()=>{game.keys.clear();game.pointer=false;game.pointerFire=false;game.mouseAimActive=false;gamepadInput.laserFire=false;gamepadInput2.laserFire=false;stopLaser();stopLaserSound();});
    canvas.addEventListener('pointerdown',e=>{updatePointerPosition(e);if(e.pointerType==='touch'){game.pointer=true;game.pointerFire=true;canvas.setPointerCapture(e.pointerId);}});
    canvas.addEventListener('pointermove',e=>{if(e.pointerType==='touch'){if(game.pointer)updatePointerPosition(e);}else updatePointerPosition(e);});
    const stopPointer=e=>{if(e.pointerType!=='touch')return;game.pointer=false;game.pointerFire=false;};canvas.addEventListener('pointerup',stopPointer);canvas.addEventListener('pointercancel',stopPointer);canvas.addEventListener('lostpointercapture',stopPointer);
    document.querySelectorAll('[data-key]').forEach(button=>{const rawKey=button.dataset.key,key=rawKey==='Space'?' ':rawKey.toLowerCase();button.addEventListener('pointerdown',e=>{e.preventDefault();game.keys.add(key);button.setPointerCapture(e.pointerId);});const stop=()=>{game.keys.delete(key);};button.addEventListener('pointerup',stop);button.addEventListener('pointercancel',stop);button.addEventListener('lostpointercapture',stop);});
    try{game.skin=Math.max(0,Math.min(skins.length-1,Number(localStorage.getItem('cg-space-v2-skin'))||0));}catch{}
    loadSettings();refreshContinue();window.addEventListener('resize',resizeCanvas);startMenuGamepadLoop();
    document.addEventListener('space-invaders:start',()=>{if(game.mode==='title'){resizeCanvas();startGame(false);}});
    document.addEventListener('space-invaders:return-home',()=>requestAnimationFrame(startMenuGamepadLoop));
    if('ResizeObserver'in window)new ResizeObserver(resizeCanvas).observe(document.querySelector('.stage'));
  })();
