import {
  FilesetResolver,
  ImageSegmenter
} from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.4/vision_bundle.mjs";

const video = document.getElementById("video");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

let segmenter = null;
let frameId = 1; // ✅ Replaces timestamp

async function setupCamera() {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { width: 640, height: 480 },
    audio: false
  });
  video.srcObject = stream;

  return new Promise(resolve => {
    video.onloadeddata = () => {
      video.play();
      // ✅ Wait 1 frame before starting segmentation
      requestAnimationFrame(resolve);
    };
  });
}

async function loadSegmenter() {
  const vision = await FilesetResolver.forVisionTasks(
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.4/wasm"
  );

  segmenter = await ImageSegmenter.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath:
        "https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_multiclass_256x256/float32/1/selfie_multiclass_256x256.tflite",
      delegate: "GPU"
    },
    runningMode: "VIDEO",
    outputCategoryMask: false,
    outputConfidenceMasks: true
  });
}

async function renderHairMask() {
  try {
    const result = await segmenter.segmentForVideo(video, frameId++);
    const mask = result.confidenceMasks?.[1]; // Hair class

    if (!mask) {
      requestAnimationFrame(renderHairMask);
      return;
    }

    const data = mask.getAsFloat32Array();
    const width = mask.width;
    const height = mask.height;

    canvas.width = width;
    canvas.height = height;

    const imageData = ctx.createImageData(width, height);
    for (let i = 0; i < data.length; i++) {
      const confidence = data[i];
      const j = i * 4;

      if (confidence > 0.3) {
        imageData.data[j] = 128;
        imageData.data[j + 1] = 0;
        imageData.data[j + 2] = 128;
        imageData.data[j + 3] = 255;
      } else {
        imageData.data[j + 3] = 0;
      }
    }

    ctx.putImageData(imageData, 0, 0);
  } catch (err) {
    console.error("Segmentation error:", err);
  }

  requestAnimationFrame(renderHairMask);
}

(async () => {
  await setupCamera();
  await loadSegmenter();
  renderHairMask();
})();
