let waraImg;

let fireVideo;

let tyakkaSound;
let fireSound;

let burning = false;

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

    blendMode(ADD);

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

function touchStarted(){

  // iPhone用許可

  userStartAudio();

  if(DeviceMotionEvent.requestPermission){
    DeviceMotionEvent.requestPermission();
  }

  return false;
}

function touchMoved(){

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

    // 10%で着火
    if(random(1) < 0.1){

      startBurning();
    }
  }

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