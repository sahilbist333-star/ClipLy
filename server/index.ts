import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import util from 'util';
import Groq from 'groq-sdk';
import ffmpeg from 'fluent-ffmpeg';
import ytDlp from 'yt-dlp-exec';

const execPromise = util.promisify(exec);

// ES Modules fix for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

// Use the custom extracted ffmpeg binary
const customFfmpegPath = path.join(__dirname, '..', 'ffmpeg-2026-03-12-git-f9ebdb7680-essentials_build', 'bin', 'ffmpeg.exe');
if (fs.existsSync(customFfmpegPath)) {
  console.log(`[Init] Using custom FFmpeg at: ${customFfmpegPath}`);
  ffmpeg.setFfmpegPath(customFfmpegPath);
} else {
  console.warn(`[Init] Custom FFmpeg not found at ${customFfmpegPath}. Commands may fail.`);
}

app.use(cors());
app.use(express.json());

// Setup temporary folder for processing
const tmpDir = path.join(__dirname, 'tmp');
if (!fs.existsSync(tmpDir)) {
  fs.mkdirSync(tmpDir, { recursive: true });
}

// Multer for any potential file uploads
const upload = multer({ dest: tmpDir });

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

// Helper validation
function getValidUrl(urlStr: string) {
  try {
    return new URL(urlStr).toString();
  } catch (e) {
    return null;
  }
}

// ---------------------------------------------------------
// 1. Full Video Downloader (Source Quality)
// ---------------------------------------------------------
app.post('/api/download', async (req, res) => {
  const { url } = req.body;
  const validUrl = getValidUrl(url);
  
  if (!validUrl) {
    return res.status(400).json({ error: 'Invalid URL provided.' });
  }

  const outputFilename = `download_${Date.now()}.mp4`;
  const outputPath = path.join(tmpDir, outputFilename);

  console.log(`[Downloader] Starting download for: ${validUrl}`);

  try {
    // Downloads best quality (video+audio) and merges into mp4
    await ytDlp(validUrl, {
      output: outputPath,
      format: 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
      mergeOutputFormat: 'mp4',
      ffmpegLocation: customFfmpegPath,
    });

    console.log(`[Downloader] Download complete: ${outputPath}`);

    res.download(outputPath, 'SourceVideo.mp4', (err) => {
      if (err) console.error(err);
      // Clean up after download attempt
      setTimeout(() => fs.unlink(outputPath, () => {}), 1000 * 60); 
    });
  } catch (error: any) {
    console.error('[Downloader] Error:', error);
    res.status(500).json({ error: 'Failed to download video.', details: error.message });
  }
});

// ---------------------------------------------------------
// 2. Video Trimmer (Source Quality)
// ---------------------------------------------------------
app.post('/api/trim', async (req, res) => {
  const { url, startTime, endTime } = req.body;
  const validUrl = getValidUrl(url);
  
  if (!validUrl || !startTime || !endTime) {
    return res.status(400).json({ error: 'Missing URL, startTime, or endTime.' });
  }

  const outputFilename = `trimmed_${Date.now()}.mp4`;
  const outputPath = path.join(tmpDir, outputFilename);

  console.log(`[Trimmer] Starting trim for: ${validUrl} from ${startTime} to ${endTime}`);

  try {
    // yt-dlp allows avoiding a full download by using --download-sections
    // e.g. *10:15-15:00
    const timeRange = `*${startTime}-${endTime}`;

    await ytDlp(validUrl, {
      output: outputPath,
      format: 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
      mergeOutputFormat: 'mp4',
      downloadSections: timeRange,
      forceKeyFramesAtCuts: true,
      ffmpegLocation: customFfmpegPath,
    });

    console.log(`[Trimmer] Trim download complete: ${outputPath}`);

    res.download(outputPath, 'TrimmedVideo.mp4', (err) => {
      if (err) console.error(err);
      setTimeout(() => fs.unlink(outputPath, () => {}), 1000 * 60);
    });
  } catch (error: any) {
    console.error('[Trimmer] Error:', error);
    res.status(500).json({ error: 'Failed to trim video.', details: error.message });
  }
});

// ---------------------------------------------------------
// 3. AI Viral Clip Generator (The Pipeline) - Streaming Events
// ---------------------------------------------------------
app.get('/api/process-clips', async (req, res) => {
  const urlParams = req.query.url as string;
  const validUrl = getValidUrl(urlParams);

  // Set up SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  });

  const sendEvent = (type: string, data: any) => {
    res.write(`event: ${type}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  if (!validUrl) {
    sendEvent('error', { message: 'Invalid URL provided.' });
    return res.end();
  }

  const jobId = Date.now().toString();
  const videoPath = path.join(tmpDir, `source_${jobId}.mp4`);
  const audioPath = path.join(tmpDir, `audio_${jobId}.mp3`);

  console.log(`[AI Clips] Starting processing for: ${validUrl}`);
  sendEvent('progress', { step: 'Initializing', details: 'Preparing download environment...' });

  try {
    // Step 1: Download ONLY audio (fastest, lowest impact on disk/network for 4hr+ streams)
    console.log(`[AI Clips] Downloading audio stream only...`);
    sendEvent('progress', { step: 'Fetching Audio', details: 'Downloading audio stream directly (skipping video)...' });
    
    await ytDlp(validUrl, {
      output: audioPath,
      format: 'worstaudio[ext=m4a]/bestaudio',
      extractAudio: true,
      audioFormat: 'mp3',
      downloadSections: '*00:00:00-00:03:00', // Only process first 3 mins for speed
      ffmpegLocation: customFfmpegPath,
    });

    // Step 2: Fast Transcription with Groq (Whisper Large V3)
    console.log(`[AI Clips] Transcribing audio with Groq...`);
    sendEvent('progress', { step: 'Transcribing', details: 'Running Whisper Large V3 on Groq...' });
    
    const transcription = await groq.audio.transcriptions.create({
      file: fs.createReadStream(audioPath),
      model: 'whisper-large-v3',
      response_format: 'verbose_json',
    });

    const fullText = transcription.text;

    // Step 4: Analyze transcript with Llama-3 to find viral hooks
    console.log(`[AI Clips] Analyzing with Llama 3 to find hooks...`);
    sendEvent('progress', { step: 'AI Analysis', details: 'Llama 3 is analyzing the transcript for viral hooks...' });
    
    const prompt = `
      You are an expert short-form video editor (like TikTok/Reels).
      Read the following transcript and find the top 3 most engaging "viral hooks" or moments.
      Each moment should be between 15 and 60 seconds of context.
      
      Respond in raw JSON format as an array of objects:
      [
        {
          "title": "A catchy title for the clip",
          "explanation": "Why this goes viral",
          "score": 99,
          "quote_start": "The exact first few words of the clip from the text",
          "quote_end": "The exact last few words of the clip from the text"
        }
      ]

      Transcript:
      ${fullText}
    `;

    const chatCompletion = await groq.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: 'llama3-70b-8192',
      temperature: 0.2,
      response_format: { type: 'json_object' }
    });

    const aiContent = chatCompletion.choices[0]?.message?.content;
    let hooks = [];
    if (aiContent) {
      try {
        const parsed = JSON.parse(aiContent);
        hooks = Array.isArray(parsed) ? parsed : Object.values(parsed)[0];
      } catch(e) {
        console.error("Format error:", e);
      }
    }

    console.log(`[AI Clips] Found ${hooks.length} potential clips.`);
    sendEvent('progress', { step: 'Finalizing', details: 'Wrapping up extracted clips...' });

    // Send the final successful response!
    sendEvent('complete', {
      success: true,
      message: 'Video successfully analyzed',
      clips: hooks,
      transcript_preview: fullText.substring(0, 200) + '...'
    });

    res.end(); // close connection

    // Cleanup background files
    setTimeout(() => {
      fs.unlink(audioPath, () => {});
    }, 5000);

  } catch (error: any) {
    console.error('[AI Clips] Error:', error);
    sendEvent('error', { message: 'Pipeline failed.', details: error.message });
    res.end();
  }
});

app.listen(port, () => {
  console.log(`ClipLy API listening on port ${port}`);
});
