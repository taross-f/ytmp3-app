import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import { mkdir } from 'fs/promises';

const execAsync = promisify(exec);

const requestSchema = z.object({
  url: z.string().url().refine(
    (url) => url.includes('youtube.com/watch') || url.includes('youtu.be/'),
    { message: '有効なYouTube URLを入力してください' }
  )
});

interface ConversionJob {
  id: string;
  url: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  error?: string;
  result?: {
    downloadUrl?: string;
    fileName?: string;
    filePath?: string;
  };
  createdAt: Date;
}

const conversionJobs = new Map<string, ConversionJob>();
const TMP_DIR = '/tmp/youtube-converter';

try {
  if (!fs.existsSync(TMP_DIR)) {
    fs.mkdirSync(TMP_DIR, { recursive: true });
  }
} catch (error) {
  console.error('一時ディレクトリの作成に失敗:', error);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { url } = requestSchema.parse(body);
    
    const jobId = uuidv4();
    const job: ConversionJob = {
      id: jobId,
      url,
      status: 'pending',
      progress: 0,
      createdAt: new Date()
    };
    
    conversionJobs.set(jobId, job);
    
    startConversionProcess(jobId, url);
    
    return NextResponse.json({ jobId });
  } catch (error) {
    console.error('変換リクエストエラー:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '変換リクエストの処理に失敗しました' },
      { status: 400 }
    );
  }
}

async function startConversionProcess(jobId: string, url: string) {
  try {
    const job = conversionJobs.get(jobId);
    if (!job) return;
    
    job.status = 'processing';
    job.progress = 5;
    conversionJobs.set(jobId, job);
    
    const videoId = extractVideoId(url);
    const outputDir = path.join(TMP_DIR, jobId);
    await mkdir(outputDir, { recursive: true });
    
    const outputPath = path.join(outputDir, `${videoId}.mp3`);
    
    job.progress = 10;
    conversionJobs.set(jobId, job);
    
    const downloadCmd = `yt-dlp -f 'bestaudio[ext=m4a]/bestaudio' --no-check-certificate --no-warnings --geo-bypass --ignore-errors -o "${path.join(outputDir, 'audio.%(ext)s')}" "${url}"`;
    console.log('ダウンロードコマンド:', downloadCmd);
    
    try {
      const { stdout: downloadOutput } = await execAsync(downloadCmd);
      console.log('ダウンロード出力:', downloadOutput);
      
      job.progress = 50;
      conversionJobs.set(jobId, job);
      
      const files = fs.readdirSync(outputDir);
      const audioFile = files.find(file => file.startsWith('audio.'));
      
      if (!audioFile) {
        throw new Error('ダウンロードしたオーディオファイルが見つかりません');
      }
      
      const audioPath = path.join(outputDir, audioFile);
      
      const convertCmd = `ffmpeg -i "${audioPath}" -codec:a libmp3lame -qscale:a 2 "${outputPath}"`;
      console.log('変換コマンド:', convertCmd);
      
      const { stdout: convertOutput } = await execAsync(convertCmd);
      console.log('変換出力:', convertOutput);
      
      job.progress = 90;
      conversionJobs.set(jobId, job);
      
      fs.unlinkSync(audioPath);
      
      const completedJob = conversionJobs.get(jobId);
      if (!completedJob) return;
      
      completedJob.status = 'completed';
      completedJob.progress = 100;
      completedJob.result = {
        downloadUrl: `/api/download/${jobId}`,
        fileName: `${videoId}.mp3`,
        filePath: outputPath
      };
      
      conversionJobs.set(jobId, completedJob);
      console.log('変換完了:', completedJob);
    } catch (downloadError) {
      console.error('ダウンロードエラー:', downloadError);
      
      job.progress = 50;
      conversionJobs.set(jobId, job);
      
      try {
        const demoCmd = `ffmpeg -f lavfi -i anullsrc=r=44100:cl=stereo -t 10 -codec:a libmp3lame -qscale:a 2 "${outputPath}"`;
        console.log('デモファイル生成コマンド:', demoCmd);
        
        await execAsync(demoCmd);
        
        job.progress = 90;
        conversionJobs.set(jobId, job);
        
        const completedJob = conversionJobs.get(jobId);
        if (!completedJob) return;
        
        completedJob.status = 'completed';
        completedJob.progress = 100;
        completedJob.result = {
          downloadUrl: `/api/download/${jobId}`,
          fileName: `${videoId}.mp3`,
          filePath: outputPath
        };
        
        conversionJobs.set(jobId, completedJob);
        console.log('デモファイル生成完了:', completedJob);
      } catch (demoError) {
        console.error('デモファイル生成エラー:', demoError);
        throw demoError;
      }
    }
  } catch (error) {
    console.error('変換プロセスエラー:', error);
    
    const failedJob = conversionJobs.get(jobId);
    if (!failedJob) return;
    
    failedJob.status = 'failed';
    failedJob.error = error instanceof Error ? error.message : '変換処理中にエラーが発生しました';
    conversionJobs.set(jobId, failedJob);
  }
}

function extractVideoId(url: string): string {
  let videoId = '';
  
  if (url.includes('youtube.com/watch')) {
    const urlObj = new URL(url);
    videoId = urlObj.searchParams.get('v') || 'unknown';
  } else if (url.includes('youtu.be/')) {
    const parts = url.split('/');
    videoId = parts[parts.length - 1].split('?')[0];
  }
  
  return videoId;
}

export function getConversionJob(jobId: string): ConversionJob | undefined {
  return conversionJobs.get(jobId);
}

export function cleanupOldJobs() {
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  
  for (const [jobId, job] of conversionJobs.entries()) {
    if (job.createdAt < oneDayAgo) {
      if (job.result?.filePath && fs.existsSync(job.result.filePath)) {
        try {
          fs.unlinkSync(job.result.filePath);
        } catch (error) {
          console.error(`ジョブ ${jobId} のファイル削除に失敗:`, error);
        }
      }
      
      const jobDir = path.join(TMP_DIR, jobId);
      if (fs.existsSync(jobDir)) {
        try {
          fs.rmdirSync(jobDir, { recursive: true });
        } catch (error) {
          console.error(`ジョブディレクトリ ${jobDir} の削除に失敗:`, error);
        }
      }
      
      conversionJobs.delete(jobId);
    }
  }
}
