import * as faceapi from 'face-api.js';

let modelsLoaded = false;

/**
 * Loads the face-api models from the public/models directory.
 * Loads SSD MobileNet (accurate) + TinyFaceDetector (fast) + landmarks + recognition.
 */
export const loadModels = async () => {
  if (modelsLoaded) return true;
  const MODEL_URL = '/models';
  try {
    await Promise.all([
      faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
      faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
      faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
      faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
    ]);
    modelsLoaded = true;
    console.log('Face models loaded successfully');
    return true;
  } catch (error) {
    console.error('Error loading face models:', error);
    return false;
  }
};

/**
 * Detects faces in an image (HTMLImageElement, HTMLVideoElement, or HTMLCanvasElement)
 * and returns the full face descriptions (with landmarks and descriptors).
 */
export const getFaceDescriptions = async (element, useTiny = false) => {
  try {
    const options = useTiny 
      ? new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 })
      : new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 });
    return await faceapi.detectAllFaces(element, options).withFaceLandmarks().withFaceDescriptors();
  } catch (error) {
    console.error('Error getting face descriptions:', error);
    return [];
  }
};

/**
 * Given a set of labeled face descriptors (e.g., from our database),
 * and the detected descriptors from the webcam, it tries to find the best match.
 */
export const createFaceMatcher = (labeledDescriptors) => {
  // labeledDescriptors should be an array of faceapi.LabeledFaceDescriptors
  // maxDescriptorDistance is 0.6 by default (lower is stricter)
  return new faceapi.FaceMatcher(labeledDescriptors, 0.6);
};

/**
 * Helper to convert a float32 array (as stored in DB) to a faceapi.LabeledFaceDescriptors
 */
export const createLabeledDescriptors = (studentId, name, descriptorArrays) => {
  const descriptors = descriptorArrays.map(arr => new Float32Array(Object.values(arr)));
  return new faceapi.LabeledFaceDescriptors(`${studentId} - ${name}`, descriptors);
};

/**
 * Convert face-api distance (0-1, lower = better) to a confidence percentage (0-100, higher = better)
 */
export const distanceToConfidence = (distance) => {
  return Math.round((1 - Math.min(distance, 1)) * 100);
};
