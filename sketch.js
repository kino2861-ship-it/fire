let waraImg;

let fireVideo;

let tyakkaSound;
let fireSound;

let burning = false;
let interactionReady = false;
let motionPermissionRequested = false;
let ignitionRolledInCurrentDrag = false;

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

    updateFireVolume();
  }
}

function ensureInteractionReady(){

  if(interactionReady){
    return;
  }

  userStartAudio();

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

  interactionReady = true;
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
    if(!tyakkaSound.isPlaying()){
      tyakkaSound.play();
    }

    // 1スライドにつき1回だけ10%で着火判定
    if(!ignitionRolledInCurrentDrag && random(1) < 0.1){

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

    if(!tyakkaSound.isPlaying()){
      tyakkaSound.play();
    }

    if(!ignitionRolledInCurrentDrag && random(1) < 0.1){

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

  fireSound.loop();

  fireSound.setVolume(0.3);
}

function updateFireVolume(){

  // 振る強さ

  let shakePower =
    abs(accelerationX) +
    abs(accelerationY);

  // 音量計算

  let targetVolume = map(
    shakePower,
    0,
    50,
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