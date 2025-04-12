import { NextResponse } from 'next/server';
import { getConversionJob } from '../../convert/route';
import fs from 'fs';
import { promisify } from 'util';

const readFileAsync = promisify(fs.readFile);

export async function GET(
  request: Request,
  { params }: { params: { jobId: string } }
) {
  try {
    const jobId = params.jobId;
    
    if (!jobId) {
      return NextResponse.json(
        { error: 'ジョブIDが指定されていません' },
        { status: 400 }
      );
    }
    
    const job = getConversionJob(jobId);
    
    if (!job) {
      return NextResponse.json(
        { error: '指定されたジョブが見つかりません' },
        { status: 404 }
      );
    }
    
    if (job.status !== 'completed' || !job.result?.fileName || !job.result?.filePath) {
      return NextResponse.json(
        { error: '変換が完了していないか、ファイルが利用できません' },
        { status: 400 }
      );
    }
    
    if (!fs.existsSync(job.result.filePath)) {
      return NextResponse.json(
        { error: 'ファイルが見つかりません' },
        { status: 404 }
      );
    }
    
    const fileData = await readFileAsync(job.result.filePath);
    
    return new NextResponse(fileData, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Disposition': `attachment; filename="${job.result.fileName}"`,
        'Content-Length': fileData.length.toString(),
      },
    });
  } catch (error) {
    console.error('ダウンロードエラー:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'ファイルのダウンロードに失敗しました' },
      { status: 500 }
    );
  }
}
