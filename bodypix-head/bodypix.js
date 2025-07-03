const video = document.getElementById("video");
const canvas = document.getElementById("canvas");
const buffer = document.getElementById("buffer");
const ctx = canvas.getContext("2d");
const bufferCtx = buffer.getContext("2d");

const FACE_PART_IDS = new Set([0, 1]); // Only face skin parts

async function setupCamera() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    video.srcObject = stream;
    return new Promise((resolve) => {
      video.onloadedmetadata = () => resolve();
    });
  } catch (e) {
    console.error("❌ Error accessing webcam:", e);
  }
}

async function main() {
  await setupCamera();
  const model = await bodyPix.load();

  const width = 640;
  const height = 480;
  canvas.width = buffer.width = width;
  canvas.height = buffer.height = height;

  async function render() {
    bufferCtx.drawImage(video, 0, 0, width, height);

    const segmentation = await model.segmentPersonParts(buffer, {
      internalResolution: "high",
      segmentationThreshold: 0.9,
      flipHorizontal: false,
    });

    const { width: segWidth, height: segHeight, data: partData } = segmentation;
    const output = new Uint8ClampedArray(segWidth * segHeight * 4);

    for (let i = 0; i < partData.length; i++) {
      const offset = i * 4;
      if (FACE_PART_IDS.has(partData[i])) {
        output[offset] = 128;     // R (Purple)
        output[offset + 1] = 0;   // G
        output[offset + 2] = 128; // B
        output[offset + 3] = 200; // A (opacity)
      } else {
        output[offset + 3] = 0;   // Fully transparent elsewhere
      }
    }

    const imageData = new ImageData(output, segWidth, segHeight);
    ctx.clearRect(0, 0, segWidth, segHeight);
    ctx.putImageData(imageData, 0, 0);

    requestAnimationFrame(render);
  }

  render();
}

main();
