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
let prevGamma = null;
let prevBeta = null;
let motionEventCount = 0;
let orientationEventCount = 0;
let motionPermissionState = "unknown";
let orientationPermissionState = "unknown";
let motionListenersAttached = false;
let orientationPermissionRequested = false;
const SHOW_DEBUG = true;

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

  // 許可プロンプトなしで直接リスナーをつけてみる（古いバージョンやPWA向け）
  attachMotionListeners();
}

function attachMotionListeners(){

  if(motionListenersAttached){
    return;
  }

  motionListenersAttached = true;
  motionPermissionState = "listeners_attached_directly";

  // p5のacceleration値が取れない端末向けフォールバック
  window.addEventListener("devicemotion", function(event){
    motionEventCount++;

    // 可能なら重力なし加速度を優先
    let src = event.acceleration || event.accelerationIncludingGravity;

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

  // devicemotionが使えない端末向けに角度変化も利用
  window.addEventListener("deviceorientation", function(event){
    orientationEventCount++;

    let gamma = Number(event.gamma);
    let beta = Number(event.beta);

    if(Number.isNaN(gamma) || Number.isNaN(beta)){
      return;
    }

    if(prevGamma === null){
      prevGamma = gamma;
      prevBeta = beta;
      return;
    }

    let dGamma = abs(gamma - prevGamma);
    let dBeta = abs(beta - prevBeta);
    let orientationPower = (dGamma + dBeta) * 0.08;

    latestMotionPower = max(
      latestMotionPower,
      lerp(latestMotionPower, orientationPower, 0.4)
    );

    prevGamma = gamma;
    prevBeta = beta;
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

  if(SHOW_DEBUG){
    drawDebugInfo();
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

    DeviceMotionEvent.requestPermission().then(function(result){
      motionPermissionState = result;

      if(result === "granted"){
        attachMotionListeners();
      }else{
        // 次回の入力で再トライできるようにする
        motionPermissionRequested = false;
      }
    }).catch(function(){
      motionPermissionState = "denied";
      motionPermissionRequested = false;
    });
  }else if(
    typeof DeviceMotionEvent !== "undefined" &&
    typeof DeviceMotionEvent.requestPermission !== "function"
  ){
    motionPermissionState = "granted";
    attachMotionListeners();
  }else if(typeof DeviceMotionEvent === "undefined"){
    motionPermissionState = "unsupported";
  }

  if(
    typeof DeviceOrientationEvent !== "undefined" &&
    typeof DeviceOrientationEvent.requestPermission === "function" &&
    !orientationPermissionRequested
  ){
    orientationPermissionRequested = true;

    DeviceOrientationEvent.requestPermission().then(function(result){

      orientationPermissionState = result;

      if(result === "granted"){
        attachMotionListeners();
      }else{
        // 次回の入力で再トライできるようにする
        orientationPermissionRequested = false;
      }
    }).catch(function(){
      orientationPermissionState = "denied";
      orientationPermissionRequested = false;
    });
  }else if(
    typeof DeviceOrientationEvent !== "undefined" &&
    typeof DeviceOrientationEvent.requestPermission !== "function"
  ){
    orientationPermissionState = "granted";
    attachMotionListeners();
  }else if(typeof DeviceOrientationEvent === "undefined"){
    orientationPermissionState = "unsupported";
  }
}

function touchStarted(){

  ensureInteractionReady();
  ignitionRolledInCurrentDrag = false;

  return false;
}

function touchMoved(){

  ensureInteractionReady();

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

  // 振る強さ（devicemotion差分ベース）
  let shakePower = latestMotionPower;

  // 無操作時に徐々に下がるように減衰
  latestMotionPower *= 0.92;

  // 音量計算

  let targetVolume = map(
    shakePower,
    0.1,
    2.5,
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

function drawDebugInfo(){

  push();
  noStroke();
  fill(0, 160);
  rect(12, 12, 290, 124, 8);

  fill(255);
  textSize(14);
  textAlign(LEFT, TOP);

  let ctxState = getAudioContext().state;
  let shakeText = nf(latestMotionPower, 1, 3);
  let volumeText = nf(fireVolume, 1, 3);
  let secureText = window.isSecureContext ? "https/secure" : "not-secure";

  text("ctx: " + ctxState, 22, 22);
  text("shake: " + shakeText, 22, 42);
  text("volume: " + volumeText, 22, 62);
  text("motionPerm: " + motionPermissionState + " / oriPerm: " + orientationPermissionState, 22, 82);
  text("motionEvt: " + motionEventCount + " / oriEvt: " + orientationEventCount, 22, 102);
  text("context: " + secureText, 22, 122);
  pop();
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
