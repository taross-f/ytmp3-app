import { NextResponse } from 'next/server';
import { getConversionJob } from '../../convert/route';

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
    
    if (job.status !== 'completed' || !job.result?.fileName) {
      return NextResponse.json(
        { error: '変換が完了していないか、ファイルが利用できません' },
        { status: 400 }
      );
    }
    
    const videoId = job.result.fileName.replace('.mp3', '');
    
    const mockMp3Data = new Uint8Array(1024).buffer;
    
    return new NextResponse(mockMp3Data, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Disposition': `attachment; filename="${job.result.fileName}"`,
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
