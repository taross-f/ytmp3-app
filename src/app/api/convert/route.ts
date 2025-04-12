import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';

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
  };
  createdAt: Date;
}

const conversionJobs = new Map<string, ConversionJob>();

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
    conversionJobs.set(jobId, job);
    
    for (let i = 1; i <= 10; i++) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const updatedJob = conversionJobs.get(jobId);
      if (!updatedJob) return;
      
      updatedJob.progress = i * 10;
      conversionJobs.set(jobId, updatedJob);
    }
    
    const completedJob = conversionJobs.get(jobId);
    if (!completedJob) return;
    
    const videoId = extractVideoId(url);
    
    completedJob.status = 'completed';
    completedJob.progress = 100;
    completedJob.result = {
      downloadUrl: `/api/download/${jobId}`,
      fileName: `${videoId}.mp3`
    };
    
    conversionJobs.set(jobId, completedJob);
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
