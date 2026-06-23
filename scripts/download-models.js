import fs from 'fs';
import path from 'path';
import https from 'https';

const modelsDir = path.join(process.cwd(), 'public', 'models');

if (!fs.existsSync(modelsDir)) {
  fs.mkdirSync(modelsDir, { recursive: true });
}

const baseUrl = 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/';

const filesToDownload = [
  'ssd_mobilenet_v1_model-weights_manifest.json',
  'ssd_mobilenet_v1_model-shard1',
  'ssd_mobilenet_v1_model-shard2',
  'face_landmark_68_model-weights_manifest.json',
  'face_landmark_68_model-shard1',
  'face_recognition_model-weights_manifest.json',
  'face_recognition_model-shard1',
  'face_recognition_model-shard2'
];

const downloadFile = (filename) => {
  return new Promise((resolve, reject) => {
    const dest = path.join(modelsDir, filename);
    const url = baseUrl + filename;

    console.log(`Downloading ${filename}...`);
    const request = https.get(url, (response) => {
      if (response.statusCode === 200) {
        const file = fs.createWriteStream(dest);
        response.pipe(file);
        file.on('finish', () => {
          file.close();
          resolve();
        });
      } else {
        reject(`Failed to download ${filename}: ${response.statusCode}`);
      }
    }).on('error', (err) => {
      fs.unlink(dest, () => {});
      reject(err.message);
    });
  });
};

const downloadAll = async () => {
  for (const file of filesToDownload) {
    try {
      await downloadFile(file);
    } catch (err) {
      console.error(err);
    }
  }
  console.log('All downloads finished.');
};

downloadAll();
