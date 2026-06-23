import * as faceapi from 'face-api.js';

/**
 * Loads the face-api models from the public/models directory.
 */
export const loadModels = async () => {
  const MODEL_URL = '/models';
  try {
    await Promise.all([
      faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
      faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
      faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
    ]);
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
export const getFaceDescriptions = async (element) => {
  try {
    return await faceapi.detectAllFaces(element).withFaceLandmarks().withFaceDescriptors();
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
