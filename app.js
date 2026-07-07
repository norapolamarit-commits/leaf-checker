const cameraView = document.querySelector("#cameraView");
const resultView = document.querySelector("#resultView");
const video = document.querySelector("#cameraPreview");
const canvas = document.querySelector("#photoCanvas");
const emptyState = document.querySelector("#emptyState");
const startCameraButton = document.querySelector("#startCamera");
const captureButton = document.querySelector("#capturePhoto");
const switchButton = document.querySelector("#switchCamera");
const uploadInput = document.querySelector("#photoUpload");
const statusPill = document.querySelector("#cameraStatus");
const snapshot = document.querySelector("#snapshot");
const snapshotEmpty = document.querySelector("#snapshotEmpty");
const processingState = document.querySelector("#processingState");
const analysisState = document.querySelector("#analysisState");
const imageQuality = document.querySelector("#imageQuality");
const confidence = document.querySelector("#confidence");
const cropHealthStatus = document.querySelector("#cropHealthStatus");
const cropCause = document.querySelector("#cropCause");
const recommendations = document.querySelector("#recommendations");
const backToCameraButton = document.querySelector("#backToCamera");

let activeStream = null;
let facingMode = "environment";
let processingTimer = null;

function showView(viewName) {
  cameraView.classList.toggle("hidden", viewName !== "camera");
  resultView.classList.toggle("hidden", viewName !== "result");
}

function setStatus(text, state = "") {
  statusPill.textContent = text;
  statusPill.className = `status-pill ${state}`.trim();
}

function stopCamera() {
  if (!activeStream) return;
  activeStream.getTracks().forEach((track) => track.stop());
  activeStream = null;
}

async function openCamera() {
  if (!window.isSecureContext) {
    setStatus("ต้องใช้ HTTPS หรือ localhost", "error");
    showCameraHelp("หน้านี้ต้องเปิดผ่าน localhost, 127.0.0.1 หรือ HTTPS เพื่อใช้กล้อง");
    return;
  }

  if (!navigator.mediaDevices?.getUserMedia) {
    setStatus("เบราว์เซอร์ไม่รองรับกล้อง", "error");
    showCameraHelp("เบราว์เซอร์นี้ไม่รองรับการเปิดกล้องจากเว็บ ให้ใช้ปุ่มเลือกรูปแทน");
    return;
  }

  stopCamera();
  setStatus("กำลังเปิดกล้อง...");

  try {
    activeStream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: {
        facingMode: { ideal: facingMode },
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
    });

    video.srcObject = activeStream;
    emptyState.classList.add("hidden");
    captureButton.disabled = false;
    switchButton.disabled = false;
    setStatus("กล้องพร้อมใช้งาน", "ready");
  } catch (error) {
    captureButton.disabled = true;
    switchButton.disabled = true;
    emptyState.classList.remove("hidden");
    setStatus("เปิดกล้องไม่ได้", "error");
    startCameraButton.innerHTML = '<span aria-hidden="true">▣</span> ลองเปิดกล้องอีกครั้ง';
    showCameraHelp(getCameraErrorMessage(error));
  }
}

function getCameraErrorMessage(error) {
  if (error?.name === "NotAllowedError") {
    return "ยังไม่ได้อนุญาตกล้อง ให้กดอนุญาตใน browser หรือใช้ปุ่มเลือกรูปแทน";
  }

  if (error?.name === "NotFoundError") {
    return "ไม่พบกล้องบนอุปกรณ์นี้ ให้ใช้ปุ่มเลือกรูปแทน";
  }

  if (error?.name === "NotReadableError") {
    return "กล้องอาจถูกใช้งานโดยแอปอื่นอยู่ ให้ปิดแอปกล้อง/วิดีโอคอลแล้วลองอีกครั้ง";
  }

  return "เปิดกล้องไม่ได้ ให้ตรวจสิทธิ์กล้องของ browser หรือใช้ปุ่มเลือกรูปเพื่อทดสอบระบบ";
}

function showCameraHelp(message) {
  setCropAnalysis("ยังไม่สามารถประเมินได้", "ยังไม่มีภาพใบที่ระบบอ่านได้ จึงยังไม่สามารถวิเคราะห์ความสมบูรณ์หรือสาเหตุได้");
  setResultContent({
    stateClass: "warn",
    title: "ยังใช้กล้องไม่ได้",
    copy: message,
    quality: "-",
    confidenceText: "-",
    items: [
      "กดอนุญาตกล้องเมื่อ browser ถาม permission",
      "ถ้าเคยกด block ให้เปิด site settings แล้ว allow camera",
      "ใช้ปุ่มเลือกรูปเพื่อทดสอบการวิเคราะห์โดยไม่ต้องเปิดกล้อง",
    ],
  });
}

function setResultContent({ stateClass, title, copy, quality, confidenceText, items }) {
  analysisState.className = `analysis-state ${stateClass}`.trim();
  analysisState.innerHTML = `
    <p class="result-title">${title}</p>
    <p class="result-copy">${copy}</p>
  `;
  imageQuality.textContent = quality;
  confidence.textContent = confidenceText;
  recommendations.innerHTML = items.map((item) => `<li>${item}</li>`).join("");
}

function setCropAnalysis(status, cause) {
  cropHealthStatus.textContent = status;
  cropCause.textContent = cause;
}

function startProcessing() {
  window.clearTimeout(processingTimer);
  showView("result");
  processingState.classList.remove("hidden");
  analysisState.className = "analysis-state";
  analysisState.innerHTML = `
    <p class="result-title">กำลังตรวจภาพใบ</p>
    <p class="result-copy">ระบบกำลังอ่านคุณภาพภาพและเตรียมข้อมูลสำหรับส่งต่อ AI</p>
  `;
  imageQuality.textContent = "-";
  confidence.textContent = "-";
  setCropAnalysis("กำลังประเมินความสมบูรณ์", "กำลังอ่านสีใบ ความสว่าง และสัญญาณความผิดปกติจากภาพ");
  recommendations.innerHTML = `
    <li>ระบบกำลังประเมินว่าควรเพิ่มหรือลดธาตุอาหาร น้ำ และการจัดการแสงอย่างไร</li>
  `;
}

function finishProcessing(signal) {
  processingTimer = window.setTimeout(() => {
    processingState.classList.add("hidden");
    renderMockAnalysis(signal);
  }, 700);
}

function resetResultForRetake() {
  window.clearTimeout(processingTimer);
  processingState.classList.add("hidden");
  snapshot.removeAttribute("src");
  snapshot.classList.remove("visible");
  snapshotEmpty.hidden = false;
  setResultContent({
    stateClass: "",
    title: "รอภาพใบ",
    copy: "เมื่อถ่ายภาพแล้ว ระบบจะแสดงผลวิเคราะห์เบื้องต้นและเตรียมจุดต่อ AI จริง",
    quality: "-",
    confidenceText: "-",
    items: [
      "ถ้าใบเหลือง ให้พิจารณาเพิ่มปุ๋ยไนโตรเจนในอัตราที่เหมาะกับชนิดพืช",
      "ถ้าใบไหม้หรือขอบใบแห้ง ให้ลดปุ๋ยเข้มข้นและตรวจการให้น้ำ",
      "ถ้ามีจุดด่างหรือแผลบนใบ ให้แยกต้นที่มีอาการและตรวจโรคพืชเพิ่มเติม",
    ],
  });
  setCropAnalysis("รอผลวิเคราะห์", "ต้องมีภาพใบก่อนจึงจะประเมินสาเหตุเบื้องต้นได้");
}

function goBackToCamera() {
  resetResultForRetake();
  showView("camera");
}

function showCameraHelpInResult() {
  showView("result");
  processingState.classList.add("hidden");
  setCropAnalysis("ยังไม่สามารถประเมินได้", "ไฟล์ภาพหรือกล้องยังไม่พร้อมใช้งาน จึงยังไม่สามารถวิเคราะห์สาเหตุของผลผลิตได้");
  setResultContent({
    stateClass: "warn",
    title: "ยังใช้กล้องไม่ได้",
    copy: "กลับไปหน้าเดิมแล้วใช้ปุ่มเลือกรูป หรืออนุญาตกล้องจาก browser settings",
    quality: "-",
    confidenceText: "-",
    items: [
      "กดอนุญาตกล้องเมื่อ browser ถาม permission",
      "ถ้าเคยกด block ให้เปิด site settings แล้ว allow camera",
      "ใช้ปุ่มเลือกรูปเพื่อทดสอบการวิเคราะห์โดยไม่ต้องเปิดกล้อง",
    ],
  });
}

function getImageSignal(ctx, width, height) {
  const sample = ctx.getImageData(0, 0, width, height).data;
  let brightness = 0;
  let greenScore = 0;
  const pixels = sample.length / 4;

  for (let i = 0; i < sample.length; i += 4) {
    const red = sample[i];
    const green = sample[i + 1];
    const blue = sample[i + 2];
    brightness += (red + green + blue) / 3;
    if (green > red * 1.04 && green > blue * 1.04) greenScore += 1;
  }

  return {
    averageBrightness: brightness / pixels,
    greenRatio: greenScore / pixels,
  };
}

function renderMockAnalysis(signal) {
  const isTooDark = signal.averageBrightness < 55;
  const isTooBright = signal.averageBrightness > 220;
  const hasLeafColor = signal.greenRatio > 0.12;
  const goodImage = !isTooDark && !isTooBright && hasLeafColor;

  imageQuality.textContent = goodImage ? "ดี" : "ควรถ่ายใหม่";
  confidence.textContent = goodImage ? "ตัวอย่าง 72%" : "ต่ำ";

  if (goodImage) {
    setCropAnalysis(
      "มีแนวโน้มสมบูรณ์ในระดับใช้งานได้",
      "ภาพมีสัญญาณสีเขียวของใบชัดและแสงอยู่ในช่วงเหมาะสม จึงยังไม่พบความเสี่ยงเด่นจากภาพนี้"
    );
    setResultContent({
      stateClass: "good",
      title: "พบลักษณะใบในภาพ",
      copy: "ตอนนี้เป็นการตรวจภาพเบื้องต้น ยังไม่ได้ train โมเดลโรคพืชจริง จุดต่อไปคือส่งภาพนี้เข้า AI service เพื่อจำแนกอาการ",
      quality: "ดี",
      confidenceText: "ตัวอย่าง 72%",
      items: [
        "รักษาปุ๋ยสูตรเดิมไว้ก่อน ไม่ควรเพิ่มปุ๋ยไนโตรเจนมากเกินไปเพราะอาจทำให้ใบอ่อนและเสี่ยงโรค",
        "ให้น้ำสม่ำเสมอโดยไม่ให้น้ำขัง ตรวจความชื้นดินก่อนรดน้ำเพิ่ม",
        "ติดตามใบชุดใหม่อีก 3-5 วัน ถ้าเริ่มเหลืองหรือเป็นจุดให้ถ่ายภาพซ้ำเพื่อเปรียบเทียบ",
      ],
    });
    return;
  }

  setCropAnalysis(
    hasLeafColor ? "ยังประเมินความสมบูรณ์ได้ไม่ชัด" : "มีความเสี่ยงว่าภาพไม่ใช่ใบหรือใบไม่ชัด",
    hasLeafColor
      ? "ภาพอาจสว่างหรือมืดเกินไป ทำให้แยกอาการใบเหลือง ใบไหม้ หรือขาดธาตุอาหารได้ไม่แม่นยำ"
      : "ระบบพบสีเขียวน้อยหรือรูปใบไม่ชัด อาจเกิดจากถ่ายไม่เต็มใบ พื้นหลังรบกวน หรือใบแห้ง/เสียหายมาก"
  );
  setResultContent({
    stateClass: "warn",
    title: "ภาพยังไม่เหมาะสำหรับวิเคราะห์",
    copy: `${
      hasLeafColor
        ? "แสงในภาพอาจมากหรือน้อยเกินไป ทำให้ AI วิเคราะห์อาการผิดพลาดได้"
        : "ระบบยังไม่พบสีหรือรูปทรงที่คล้ายใบชัดเจน ควรถ่ายให้ใบเต็มกรอบ"
    }`,
    quality: "ควรถ่ายใหม่",
    confidenceText: "ต่ำ",
    items: [
      "ถ้าใบเหลืองซีด ให้พิจารณาเพิ่มปุ๋ยไนโตรเจนทีละน้อย และตรวจว่าดินแฉะเกินไปหรือไม่",
      "ถ้าขอบใบไหม้หรือปลายใบแห้ง ให้ลดความเข้มข้นของปุ๋ย หลีกเลี่ยงการใส่ปุ๋ยตอนแดดจัด และเพิ่มน้ำอย่างพอดี",
      "ถ้ามีจุดน้ำตาลหรือแผลกระจาย ให้ลดความชื้นบนใบ เพิ่มการระบายอากาศ และแยกต้นที่มีอาการก่อน",
    ],
  });
}

function capturePhoto() {
  if (!activeStream) return;

  const width = video.videoWidth || 1280;
  const height = video.videoHeight || 720;
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(video, 0, 0, width, height);

  const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
  snapshot.src = dataUrl;
  snapshot.classList.add("visible");
  snapshotEmpty.hidden = true;

  const signal = getImageSignal(ctx, width, height);
  startProcessing();
  finishProcessing(signal);
}

function renderImageToAnalysis(image) {
  const maxWidth = 1280;
  const ratio = Math.min(1, maxWidth / image.naturalWidth);
  const width = Math.max(1, Math.round(image.naturalWidth * ratio));
  const height = Math.max(1, Math.round(image.naturalHeight * ratio));

  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(image, 0, 0, width, height);

  const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
  snapshot.src = dataUrl;
  snapshot.classList.add("visible");
  snapshotEmpty.hidden = true;
  setStatus("วิเคราะห์จากรูป", "ready");

  const signal = getImageSignal(ctx, width, height);
  startProcessing();
  finishProcessing(signal);
}

function analyzeUploadedPhoto(file) {
  if (!file) return;

  const imageUrl = URL.createObjectURL(file);
  const image = new Image();
  image.onload = () => {
    renderImageToAnalysis(image);
    URL.revokeObjectURL(imageUrl);
  };
  image.onerror = () => {
    URL.revokeObjectURL(imageUrl);
    setStatus("อ่านรูปไม่ได้", "error");
    showCameraHelp("ไฟล์รูปนี้อ่านไม่ได้ ให้เลือกไฟล์ภาพใหม่");
    showCameraHelpInResult();
  };
  image.src = imageUrl;
}

startCameraButton.addEventListener("click", openCamera);
captureButton.addEventListener("click", capturePhoto);
switchButton.addEventListener("click", async () => {
  facingMode = facingMode === "environment" ? "user" : "environment";
  await openCamera();
});
uploadInput.addEventListener("change", (event) => {
  analyzeUploadedPhoto(event.target.files?.[0]);
  uploadInput.value = "";
});
backToCameraButton.addEventListener("click", goBackToCamera);

window.addEventListener("beforeunload", stopCamera);
