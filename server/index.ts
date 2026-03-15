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
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

// Path to bundled yt-dlp.exe binary
const ytDlpBin = path.join(process.cwd(), 'node_modules', 'yt-dlp-exec', 'bin', 'yt-dlp.exe');

// Helper: run yt-dlp with explicit CLI args (bypasses yt-dlp-exec wrapper bugs)
async function runYtDlp(args: string[]): Promise<string> {
  const { stdout, stderr } = await execFileAsync(ytDlpBin, args, { maxBuffer: 1024 * 1024 * 100 });
  return stdout;
}



// ES Modules fix for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

// Use the custom extracted ffmpeg binary
const customFfmpegPath = path.join(__dirname, '..', 'ffmpeg-2026-03-12-git-9dc44b43b2-essentials_build', 'ffmpeg-2026-03-12-git-9dc44b43b2-essentials_build', 'bin', 'ffmpeg.exe');
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
    await runYtDlp([
      validUrl,
      '-f', 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
      '--merge-output-format', 'mp4',
      '--ffmpeg-location', customFfmpegPath,
      '-o', outputPath,
      '--no-playlist',
    ]);

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
    const timeRange = `*${startTime}-${endTime}`;
    const rawClipPath = path.join(tmpDir, `raw_clip_${Date.now()}.mp4`);

    // Step 1: Download the segment
    await runYtDlp([
      validUrl,
      '-f', 'bestvideo[height<=1080][ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
      '--merge-output-format', 'mp4',
      '--download-sections', timeRange,
      '--force-keyframes-at-cuts',
      '--ffmpeg-location', customFfmpegPath,
      '-o', rawClipPath,
      '--no-playlist',
    ]);

    // Step 2: ffmpeg center-crop to 9:16 portrait (1080x1920)
    console.log(`[Trimmer] Cropping to 9:16...`);
    await new Promise((resolve, reject) => {
      ffmpeg(rawClipPath)
        .videoFilter([
          'crop=ih*9/16:ih',   // center crop to 9:16 ratio
          'scale=1080:1920',   // scale to 1080p portrait
        ])
        .audioCodec('aac')
        .videoCodec('libx264')
        .outputOptions(['-preset', 'fast', '-crf', '23'])
        .output(outputPath)
        .on('end', resolve)
        .on('error', reject)
        .run();
    });

    // Cleanup raw clip
    fs.unlink(rawClipPath, () => {});
    console.log(`[Trimmer] 9:16 crop complete: ${outputPath}`);

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
  const rawAudioPath = path.join(tmpDir, `raw_audio_${jobId}.m4a`);
  const audioPath = path.join(tmpDir, `audio_${jobId}.mp3`);

  console.log(`[AI Clips] Starting processing for: ${validUrl}`);
  sendEvent('progress', { step: 'Initializing', details: 'Preparing download environment...' });

  try {
    // Step 1: Get video duration first
    console.log(`[AI Clips] Getting video info...`);
    const infoRaw = await runYtDlp([
      validUrl, '--print', 'duration', '--no-playlist', '--no-download',
    ]).catch(() => '600');
    const totalDuration = parseInt((infoRaw || '600').trim()) || 600;
    console.log(`[AI Clips] Video duration: ${totalDuration}s`);

    // Sample audio from 3 spread positions: 10%, 40%, 70% of the video
    // This ensures we don't just analyze the intro of a 4.5-hour stream
    const samplePoints = totalDuration > 600
      ? [
          Math.floor(totalDuration * 0.10),
          Math.floor(totalDuration * 0.40),
          Math.floor(totalDuration * 0.70),
        ]
      : [0]; // For short videos, just start from beginning

    const allTranscripts: string[] = [];
    for (const startSec of samplePoints) {
      const samplePath = path.join(tmpDir, `sample_${jobId}_${startSec}.m4a`);
      try {
        sendEvent('progress', { step: 'Fetching Audio', details: `Sampling audio at ${Math.floor(startSec/60)} min mark...` });
        await runYtDlp([
          validUrl,
          '-f', 'worstaudio[ext=m4a]/bestaudio[ext=m4a]/worstaudio/bestaudio',
          '--ffmpeg-location', customFfmpegPath,
          '--download-sections', `*${startSec}-${startSec + 60}`,
          '-o', samplePath,
          '--no-playlist',
        ]);
        // Quick transcription of this sample
        const t = await groq.audio.transcriptions.create({
          file: fs.createReadStream(samplePath),
          model: 'whisper-large-v3',
          response_format: 'text' as any,
        });
        allTranscripts.push(`[At ${Math.floor(startSec/60)} min] ${t}`);
        fs.unlink(samplePath, () => {});
      } catch(e) {
        console.warn(`[AI Clips] Sample at ${startSec}s failed, skipping`);
      }
    }

    const combinedTranscript = allTranscripts.join('\n\n');
    console.log(`[AI Clips] Got ${allTranscripts.length} transcript samples`);

    // Step 4: Analyze transcript with Llama-3 to find viral hooks
    console.log(`[AI Clips] Analyzing with Llama 3 to find hooks...`);
    sendEvent('progress', { step: 'AI Analysis', details: 'Llama 3 is finding the most viral moments in the stream...' });
    
    const prompt = `
      You are an expert short-form video editor specializing in viral Twitch/YouTube clips.
      Below are transcript samples taken from DIFFERENT POINTS in a long stream/video.
      Each sample is labelled with [At X min] showing where in the video it was taken from.

      Find the TOP 3 most engaging viral moments. IMPORTANT: each clip MUST come from a DIFFERENT sample (different time point).
      Look for: surprising reveals, emotional moments, funny reactions, hot takes, or memorable quotes.

      You MUST return valid JSON in exactly this format:
      {
        "clips": [
          {
            "title": "Short catchy title",
            "explanation": "Why this clip goes viral",
            "score": 95,
            "quote_start": "First few words of the moment",
            "approx_minute": 42
          }
        ]
      }

      The "approx_minute" field must be the EXACT minute number shown in the [At X min] label for that sample.
      Each clip must have a DIFFERENT approx_minute value.

      Transcript Samples:
      ${combinedTranscript}
    `;

    const chatCompletion = await groq.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.2,
      response_format: { type: 'json_object' }
    });

    const aiContent = chatCompletion.choices[0]?.message?.content;
    let hooks: any[] = [];
    if (aiContent) {
      try {
        const parsed = JSON.parse(aiContent);
        if (Array.isArray(parsed)) {
          hooks = parsed;
        } else {
          const firstArray = Object.values(parsed).find(v => Array.isArray(v));
          hooks = (firstArray as any[]) || [];
        }
      } catch(e) {
        console.error('[AI Clips] JSON parse error:', e);
      }
    }

    // Map each hook to timestamps based on approx_minute from AI
    const hooksWithTimestamps = hooks.map((hook: any) => {
      const approxMin = hook.approx_minute || 0;
      const startSec = Math.max(0, approxMin * 60);
      const endSec = startSec + 45;

      const toHMS = (s: number) => {
        const h = Math.floor(s / 3600).toString().padStart(2, '0');
        const m = Math.floor((s % 3600) / 60).toString().padStart(2, '0');
        const sec = Math.floor(s % 60).toString().padStart(2, '0');
        return `${h}:${m}:${sec}`;
      };

      return {
        ...hook,
        startTime: toHMS(startSec),
        endTime: toHMS(endSec),
        duration: '0:45',
      };
    });

    console.log(`[AI Clips] Found ${hooksWithTimestamps.length} potential clips.`);

    // Send the final successful response!
    sendEvent('complete', {
      success: true,
      message: 'Video successfully analyzed',
      clips: hooksWithTimestamps,
      transcript_preview: combinedTranscript.substring(0, 200) + '...'
    });

    res.end(); // close connection

    // Cleanup: sample files are already deleted inline above    
    setTimeout(() => {
      fs.unlink(rawAudioPath, () => {});
      fs.unlink(audioPath, () => {});
    }, 1000);

  } catch (error: any) {
    console.error('[AI Clips] Pipeline Error:', error?.message || error);
    console.error('[AI Clips] Error details:', error?.stderr || error?.stack || '');
    sendEvent('error', { message: 'Pipeline failed.', details: error?.message || 'Unknown error' });
    res.end();
  }
});

app.listen(port, () => {
  console.log(`ClipLy API listening on port ${port}`);
});
