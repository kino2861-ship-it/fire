let waraImg;

let fireVideo;

let tyakkaSound;
let fireSound;

let burning = false;
let interactionReady = false;
let motionPermissionRequested = false;
let ignitionRolledInCurrentDrag = false;
let pendingFireSoundStart = false;
let touchVelocity = 0;
let prevTouchX = null;
let prevTouchY = null;
let prevTouchTime = 0;
let lastIgnitionRand = null;

let trails = [];

let fireVolume = 0.3;
const SHOW_DEBUG = true;

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

  // 動画はDOMで非表示にしてキャンバスへ描画
  fireVideo.hide();

  fireVideo.volume(0);

  strokeCap(ROUND);
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

  // 燃焼状態（炎は動画をキャンバスへ描画）
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
  }

  // 常に音量更新（燃焼中に fireSound が再生されていれば反映される）
  updateFireVolume();

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
}

function touchStarted(){

  ensureInteractionReady();
  ignitionRolledInCurrentDrag = false;
  // 初期化して大きな dt による速度誤検出を防ぐ
  prevTouchX = mouseX;
  prevTouchY = mouseY;
  prevTouchTime = millis();

  return false;
}

function touchMoved(){

  ensureInteractionReady();

  // タッチ移動速度を計算
  let now = millis();
  if(prevTouchX !== null && prevTouchY !== null && now > prevTouchTime){
    let dx = mouseX - prevTouchX;
    let dy = mouseY - prevTouchY;
    let dt = now - prevTouchTime;
    
    touchVelocity = sqrt(dx*dx + dy*dy) / max(dt, 1);
  }
  
  prevTouchX = mouseX;
  prevTouchY = mouseY;
  prevTouchTime = now;

  if(!burning){

    // 軌跡追加
    trails.push({
      x: mouseX,
      y: mouseY,
      life: 255
    });

    // 着火音
    playTyakkaIfReady();

    // 1スライドにつき1回だけ10%で着火判定（ログ追加）
    if(!ignitionRolledInCurrentDrag){
      let r = random(1);
      lastIgnitionRand = r;
      console.log('ignition-check', r, ignitionRolledInCurrentDrag);

      if(r < 0.1){
        ignitionRolledInCurrentDrag = true;
        startBurning();
      }
    }

  }

  return false;
}

function mouseDragged(){

  ensureInteractionReady();

  // マウス移動速度を計算
  let now = millis();
  if(prevTouchX !== null && prevTouchY !== null && now > prevTouchTime){
    let dx = mouseX - prevTouchX;
    let dy = mouseY - prevTouchY;
    let dt = now - prevTouchTime;
    
    touchVelocity = sqrt(dx*dx + dy*dy) / max(dt, 1);
  }
  
  prevTouchX = mouseX;
  prevTouchY = mouseY;
  prevTouchTime = now;

  if(!burning){

    trails.push({
      x: mouseX,
      y: mouseY,
      life: 255
    });

    playTyakkaIfReady();

    if(!ignitionRolledInCurrentDrag){
      let r = random(1);
      lastIgnitionRand = r;
      console.log('ignition-check (mouse)', r, ignitionRolledInCurrentDrag);

      if(r < 0.1){
        ignitionRolledInCurrentDrag = true;
        startBurning();
      }
    }

  }

  return false;
}

function touchEnded(){

  ignitionRolledInCurrentDrag = false;
  prevTouchX = null;
  prevTouchY = null;

  return false;
}

function mousePressed(){

  ignitionRolledInCurrentDrag = false;
  prevTouchX = mouseX;
  prevTouchY = mouseY;
  prevTouchTime = millis();

  return false;
}

function mouseReleased(){

  ignitionRolledInCurrentDrag = false;
  prevTouchX = null;
  prevTouchY = null;

  return false;
}

function startBurning(){

  burning = true;

  fireVideo.loop();
  fireVideo.play();

  pendingFireSoundStart = true;
  ensureFireSoundPlaying();
}

function updateFireVolume(){

  // スライド速度から音量を計算
  let targetVolume = map(
    touchVelocity,
    0,
    1,
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
    0.15
  );

  fireSound.setVolume(fireVolume);
  
  // 速度減衰
  touchVelocity *= 0.88;
}

function drawDebugInfo(){

  push();
  noStroke();
  fill(0, 160);
  rect(12, 12, 260, 104, 8);

  fill(255);
  textSize(14);
  textAlign(LEFT, TOP);

  let ctxState = getAudioContext().state;
  let velocityText = nf(touchVelocity, 1, 2);
  let volumeText = nf(fireVolume, 1, 3);
  let lastRandText = lastIgnitionRand === null ? "-" : nf(lastIgnitionRand, 1, 3);

  text("ctx: " + ctxState, 22, 22);
  text("velocity: " + velocityText, 22, 42);
  text("volume: " + volumeText, 22, 62);
  text("lastRand: " + lastRandText, 22, 82);
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
