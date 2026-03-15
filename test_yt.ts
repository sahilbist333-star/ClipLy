import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import ytDlp from 'yt-dlp-exec';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const customFfmpegPath = path.join(__dirname, 'ffmpeg-2026-03-12-git-f9ebdb7680-essentials_build', 'bin', 'ffmpeg.exe');

async function test() {
  const url = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
  const audioPath = path.join(__dirname, 'tmp', `audio_test.mp3`);
  
  try {
    console.log('Running test...');
    await ytDlp(url, {
      output: audioPath,
      format: 'worstaudio[ext=m4a]/bestaudio',
      extractAudio: true,
      audioFormat: 'mp3',
      downloadSections: '*00:00:00-00:03:00',
      ffmpegLocation: customFfmpegPath,
    });
    console.log('Success!');
  } catch (err: any) {
    console.error('FAILED MESSAGE:', err.message);
    console.error('FAILED STDERR:', err.stderr);
  }
}

test();
