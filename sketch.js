let waraImg;

let fireVideo;

let tyakkaSound;
let fireSound;

let burning = false;
let interactionReady = false;
let motionPermissionRequested = false;
let ignitionRolledInCurrentDrag = false;
let pendingFireSoundStart = false;
let latestMotionPower = 0;
let prevMotionX = null;
let prevMotionY = null;
let prevMotionZ = null;
const SLIDE_COOLDOWN_MS = 2000;
let lastSlideAcceptedAt = -SLIDE_COOLDOWN_MS;

let trails = [];

let fireVolume = 0.3;

function preload(){

  waraImg = loadImage("wara.jpg");

  fireVideo = createVideo("fireEffect.mp4");

  tyakkaSound = loadSound("tyakka.mp3");

  fireSound = loadSound("fire.mp3");
}

function setup(){

  createCanvas(windowWidth, windowHeight);

  imageMode(CENTER);

  // モバイルで別プレイヤー表示にならないようにする
  fireVideo.attribute("playsinline", "");
  fireVideo.attribute("webkit-playsinline", "");

  fireVideo.hide();

  fireVideo.volume(0);

  strokeCap(ROUND);

  // p5のacceleration値が取れない端末向けフォールバック
  window.addEventListener("devicemotion", function(event){

    let src = event.accelerationIncludingGravity || event.acceleration;

    if(!src){
      return;
    }

    let ax = Number(src.x) || 0;
    let ay = Number(src.y) || 0;
    let az = Number(src.z) || 0;

    if(prevMotionX === null){
      prevMotionX = ax;
      prevMotionY = ay;
      prevMotionZ = az;
      return;
    }

    // 重力の定常成分を避けるため、前回値との差分をシェイク強度に使う
    let dx = abs(ax - prevMotionX);
    let dy = abs(ay - prevMotionY);
    let dz = abs(az - prevMotionZ);

    let instantPower = dx + dy + dz;

    latestMotionPower = lerp(latestMotionPower, instantPower, 0.5);

    prevMotionX = ax;
    prevMotionY = ay;
    prevMotionZ = az;
  });
}

function draw(){

  background(0);

  // 藁画像
  image(
    waraImg,
    width/2,
    height/2,
    width,
    height
  );

  // 赤い軌跡
  drawTrails();

  // 燃焼状態
  if(burning){

    // 黒背景を透過的に扱って炎だけを重ねる
    blendMode(SCREEN);

    image(
      fireVideo,
      width/2,
      height/2,
      width,
      height
    );

    blendMode(BLEND);

    ensureFireSoundPlaying();

    updateFireVolume();
  }
}

function isAudioRunning(){

  return getAudioContext().state === "running";
}

function ensureFireSoundPlaying(){

  if(!burning){
    return;
  }

  if(isAudioRunning()){

    if(!fireSound.isPlaying()){
      fireSound.loop();
      fireSound.setVolume(fireVolume);
    }

    pendingFireSoundStart = false;
    return;
  }

  pendingFireSoundStart = true;
}

function playTyakkaIfReady(){

  if(isAudioRunning() && !tyakkaSound.isPlaying()){
    tyakkaSound.play();
  }
}

function ensureInteractionReady(){

  if(!interactionReady){
    interactionReady = true;

    userStartAudio().then(function(){

      if(pendingFireSoundStart){
        ensureFireSoundPlaying();
      }
    }).catch(function(){
      // 次の入力で再試行できるようにする
      interactionReady = false;
    });

  }

  if(!isAudioRunning()){
    getAudioContext().resume().then(function(){

      if(pendingFireSoundStart){
        ensureFireSoundPlaying();
      }
    }).catch(function(){
      // 拒否時は次回入力で再試行
    });
  }

  if(
    !motionPermissionRequested &&
    typeof DeviceMotionEvent !== "undefined" &&
    typeof DeviceMotionEvent.requestPermission === "function"
  ){
    motionPermissionRequested = true;

    DeviceMotionEvent.requestPermission().catch(function(){
      // 拒否時はそのまま継続
    });
  }
}

function canAcceptSlide(){

  let now = millis();

  if(now - lastSlideAcceptedAt < SLIDE_COOLDOWN_MS){
    return false;
  }

  lastSlideAcceptedAt = now;
  return true;
}

function touchStarted(){

  ensureInteractionReady();
  ignitionRolledInCurrentDrag = false;

  return false;
}

function touchMoved(){

  ensureInteractionReady();

  if(!canAcceptSlide()){
    return false;
  }

  if(!burning){

    // 軌跡追加
    trails.push({
      x: mouseX,
      y: mouseY,
      life: 255
    });

    // 着火音
    playTyakkaIfReady();

    // 1スライドにつき1回だけ25%で着火判定
    if(!ignitionRolledInCurrentDrag && random(1) < 0.25){

      ignitionRolledInCurrentDrag = true;

      startBurning();
    }

    if(!ignitionRolledInCurrentDrag){
      ignitionRolledInCurrentDrag = true;
    }
  }

  return false;
}

function mouseDragged(){

  ensureInteractionReady();

  if(!canAcceptSlide()){
    return false;
  }

  if(!burning){

    trails.push({
      x: mouseX,
      y: mouseY,
      life: 255
    });

    playTyakkaIfReady();

    if(!ignitionRolledInCurrentDrag && random(1) < 0.25){

      ignitionRolledInCurrentDrag = true;

      startBurning();
    }

    if(!ignitionRolledInCurrentDrag){
      ignitionRolledInCurrentDrag = true;
    }
  }

  return false;
}

function touchEnded(){

  ignitionRolledInCurrentDrag = false;

  return false;
}

function mousePressed(){

  ignitionRolledInCurrentDrag = false;

  return false;
}

function mouseReleased(){

  ignitionRolledInCurrentDrag = false;

  return false;
}

function startBurning(){

  burning = true;

  fireVideo.loop();

  pendingFireSoundStart = true;
  ensureFireSoundPlaying();
}

function updateFireVolume(){

  // 振る強さ（値の変化量ベース）

  let p5Power =
    abs(Number(accelerationX) || 0) +
    abs(Number(accelerationY) || 0);

  let shakePower = max(p5Power, latestMotionPower);

  // 無操作時に徐々に下がるように減衰
  latestMotionPower *= 0.9;

  // 音量計算

  let targetVolume = map(
    shakePower,
    0,
    8,
    0.3,
    1.0
  );

  targetVolume = constrain(
    targetVolume,
    0.3,
    1.0
  );

  // なめらか補間

  fireVolume = lerp(
    fireVolume,
    targetVolume,
    0.1
  );

  fireSound.setVolume(fireVolume);
}

function drawTrails(){

  noFill();

  for(let i=trails.length-1; i>=0; i--){

    let t = trails[i];

    stroke(
      255,
      0,
      0,
      t.life
    );

    strokeWeight(20);

    point(t.x, t.y);

    t.life -= 8;

    if(t.life <= 0){

      trails.splice(i,1);
    }
  }
}

function windowResized(){

  resizeCanvas(
    windowWidth,
    windowHeight
  );
}