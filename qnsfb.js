const URL = "./tm-my-image-model/";
const threshold = 0.90;

let model, webcam, stream, maxPredictions;
let handled = false;  // 중복 실행 방지

// 초기화 및 웹캠 시작
async function init() {
  const modelURL = URL + "model.json";
  const metadataURL = URL + "metadata.json";

  model = await tmImage.load(modelURL, metadataURL);
  maxPredictions = model.getTotalClasses();

  webcam = new tmImage.Webcam(224, 224, true);
  try {
  await webcam.setup({ facingMode: "environment" });
} catch (e) {
  console.warn("후면 카메라 접근 실패, 전면 카메라로 시도합니다.");
  await webcam.setup({ facingMode: "user" });
}

  await webcam.play();
  window.requestAnimationFrame(loop);

  document.getElementById("webcam").appendChild(webcam.canvas);
  await loadAndPlay();
}

// 루프 → 매 프레임마다 예측
async function loop() {
  webcam.update();
  await predict();
  window.requestAnimationFrame(loop);
}

// 예측 및 분류 결과 처리
async function predict() {
  if (handled) return;

  const prediction = await model.predict(webcam.canvas);
  let highest = prediction.reduce((a, b) => a.probability > b.probability ? a : b);

  let label, tip;

  if (highest.probability < threshold) {
    label = "혼합/일반 쓰레기";
    tip = "해당 쓰레기는 분류가 어렵거나 오염되어 일반쓰레기로 배출해야 합니다.";
  } else {
    label = highest.className;
    tip = getTip(label);
    const videoUrl = getVideoUrl(label);

    handled = true;
    webcam.stop();
    openResultTab(label, tip, videoUrl);
  }

  document.getElementById("result").innerText = `쓰레기 분류 결과: ${label}`;
  document.getElementById("tip").innerText = tip;
}

// 분류된 쓰레기 종류에 따라 안내 문장 반환
function getTip(type) {
  switch (type) {
    case "플라스틱":
      return "라벨을 제거하고 깨끗이 씻은 후, 압축하여 배출하세요.";
    case "비닐":
      return "이물질이 없는 비닐만 재활용됩니다. 음식물이 묻었다면 일반 쓰레기로 버리세요.";
    case "종이":
      return "테이프나 스티커를 제거하고 펼쳐서 배출하세요. 젖은 종이는 일반 쓰레기로!";
    case "스티로폼":
      return "음식물이나 이물질을 제거하고, 깨끗한 상태로 배출하세요.";
    case "캔":
      return "내용물을 비우고 헹군 후, 압축해서 배출하세요.";
    case "유리병":
      return "뚜껑을 분리하고, 깨끗이 씻은 후 배출하세요.";
    default:
      return "해당 쓰레기의 분리배출 방법을 찾을 수 없습니다.";
  }
}

// 쓰레기 종류에 따라 영상 URL 반환
function getVideoUrl(type) {
  switch (type) {
    case "플라스틱":
      return "videos/plastic.mp4";
    case "비닐":
      return "videos/vinyl.mp4";
    case "종이":
      return "videos/paper.mp4";
    case "스티로폼":
      return "videos/styrofoam.mp4";
    case "캔":
      return "videos/can.mp4";
    case "유리병":
      return "videos/glass.mp4";
    default:
      return "videos/general.mp4";
  }
}

// 새 탭 열고 안내 문장과 영상 표시
function openResultTab(label, tip, videoUrl) {
  const win = window.open("", "_blank");
  win.document.write(`
    <html lang="ko">
    <head>
      <title>분리배출 안내</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          padding: 30px;
          text-align: center;
        }
        h1 {
          font-size: 28px;
          color: #2c3e50;
        }
        p {
          font-size: 18px;
          color: #555;
        }
        video {
          margin-top: 20px;
          width: 640px;
          height: 360px;
          border: 2px solid #444;
        }
      </style>
    </head>
    <body>
      <h1>분류: ${label}</h1>
      <p>${tip}</p>
      <video controls autoplay>
        <source src="${videoUrl}" type="video/mp4">
        지원되지 않는 브라우저입니다.
      </video>
    </body>
    </html>
  `);
}

// 웹캠 수동 제어를 위한 추가 함수 (필요 시 사용)
async function loadAndPlay() {
  const video = document.getElementById('myVideo');
  stream = await getDeviceStream({
    video: { width: 640, height: 480 },
    audio: false
  });
  video.srcObject = stream;
}

function getDeviceStream(option) {
  if ('getUserMedia' in navigator.mediaDevices) {
    return navigator.mediaDevices.getUserMedia(option);
  } else {
    return new Promise(function(resolve, reject) {
      navigator.getUserMedia(option, resolve, reject);
    });
  }
}
