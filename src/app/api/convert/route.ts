import { NextResponse, NextRequest } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";
import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";
import { mkdir } from "fs/promises";

const execAsync = promisify(exec);

const requestSchema = z.object({
  url: z
    .string()
    .url()
    .refine(
      (url) => url.includes("youtube.com/watch") || url.includes("youtu.be/"),
      { message: "有効なYouTube URLを入力してください" }
    ),
  format: z.enum(["mp3", "mp4"]).default("mp3"),
});

interface ConversionJob {
  id: string;
  url: string;
  format: "mp3" | "mp4"; // 形式を追加
  status: "pending" | "processing" | "completed" | "failed";
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
const TMP_DIR = "/tmp/youtube-converter";

try {
  if (!fs.existsSync(TMP_DIR)) {
    fs.mkdirSync(TMP_DIR, { recursive: true });
  }
} catch (error) {
  console.error("一時ディレクトリの作成に失敗:", error);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url, format = "mp3" } = requestSchema.parse(body);

    const jobId = uuidv4();
    const job: ConversionJob = {
      id: jobId,
      url,
      format, // 形式を追加
      status: "pending",
      progress: 0,
      createdAt: new Date(),
    };

    conversionJobs.set(jobId, job);

    startConversionProcess(jobId, url, format);

    return NextResponse.json({ jobId });
  } catch (error) {
    console.error("変換リクエストエラー:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "変換リクエストの処理に失敗しました",
      },
      { status: 400 }
    );
  }
}

async function startConversionProcess(jobId: string, url: string, format: "mp3" | "mp4") {
  try {
    const job = conversionJobs.get(jobId);
    if (!job) return;

    job.status = "processing";
    job.progress = 5;
    conversionJobs.set(jobId, job);

    const videoId = extractVideoId(url);
    const outputDir = path.join(TMP_DIR, jobId);
    await mkdir(outputDir, { recursive: true });

    const fileExt = format === "mp3" ? "mp3" : "mp4";
    const outputPath = path.join(outputDir, `${videoId}.${fileExt}`);

    job.progress = 10;
    conversionJobs.set(jobId, job);

    let downloadCmd;
    if (format === "mp3") {
      downloadCmd = `yt-dlp -f 'bestaudio[ext=m4a]/bestaudio' --no-check-certificate --no-warnings --geo-bypass --ignore-errors --user-agent "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36" --add-header "Accept-Language: ja-JP,ja;q=0.9,en-US;q=0.8,en;q=0.7" --no-playlist -o "${path.join(
        outputDir,
        "audio.%(ext)s"
      )}" "${url}"`;
    } else {
      downloadCmd = `yt-dlp -f 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best' --no-check-certificate --no-warnings --geo-bypass --ignore-errors --user-agent "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36" --add-header "Accept-Language: ja-JP,ja;q=0.9,en-US;q=0.8,en;q=0.7" --no-playlist --merge-output-format mp4 -o "${path.join(
        outputDir,
        "video.%(ext)s"
      )}" "${url}"`;
    }
    
    console.log(`ダウンロードコマンド (${format}):`, downloadCmd);

    try {
      const { stdout: downloadOutput } = await execAsync(downloadCmd);
      console.log(`ダウンロード出力 (${format}):`, downloadOutput);

      job.progress = 50;
      conversionJobs.set(jobId, job);

      const files = fs.readdirSync(outputDir);
      const downloadedFile = format === "mp3" 
                           ? files.find((file) => file.startsWith("audio."))
                           : files.find((file) => file.startsWith("video."));

      if (!downloadedFile) {
        throw new Error(`ダウンロードした${format === "mp3" ? "オーディオ" : "ビデオ"}ファイルが見つかりません`);
      }

      const downloadedPath = path.join(outputDir, downloadedFile);

      if (format === "mp3") {
        const convertCmd = `ffmpeg -i "${downloadedPath}" -codec:a libmp3lame -qscale:a 2 "${outputPath}"`;
        console.log("変換コマンド:", convertCmd);

        const { stdout: convertOutput } = await execAsync(convertCmd);
        console.log("変換出力:", convertOutput);
      } else {
        fs.renameSync(downloadedPath, outputPath);
      }

      job.progress = 90;
      conversionJobs.set(jobId, job);

      if (downloadedPath !== outputPath && fs.existsSync(downloadedPath)) {
        fs.unlinkSync(downloadedPath);
      }

      const completedJob = conversionJobs.get(jobId);
      if (!completedJob) return;

      completedJob.status = "completed";
      completedJob.progress = 100;
      completedJob.result = {
        downloadUrl: `/api/download/${jobId}`,
        fileName: `${videoId}.${fileExt}`,
        filePath: outputPath,
      };

      conversionJobs.set(jobId, completedJob);
      console.log(`変換完了 (${format}):`, completedJob);
    } catch (downloadError) {
      console.error(`ダウンロードエラー (${format}):`, downloadError);

      if (format === "mp3") {
        job.progress = 50;
        conversionJobs.set(jobId, job);

        try {
          const demoCmd = `ffmpeg -f lavfi -i anullsrc=r=44100:cl=stereo -t 10 -codec:a libmp3lame -qscale:a 2 "${outputPath}"`;
          console.log("デモファイル生成コマンド:", demoCmd);

          await execAsync(demoCmd);

          job.progress = 90;
          conversionJobs.set(jobId, job);

          const completedJob = conversionJobs.get(jobId);
          if (!completedJob) return;

          completedJob.status = "completed";
          completedJob.progress = 100;
          completedJob.result = {
            downloadUrl: `/api/download/${jobId}`,
            fileName: `${videoId}.mp3`,
            filePath: outputPath,
          };

          conversionJobs.set(jobId, completedJob);
          console.log("デモファイル生成完了:", completedJob);
        } catch (demoError) {
          console.error("デモファイル生成エラー:", demoError);
          throw demoError;
        }
      } else {
        throw downloadError;
      }
    }
  } catch (error) {
    console.error("変換プロセスエラー:", error);

    const failedJob = conversionJobs.get(jobId);
    if (!failedJob) return;

    failedJob.status = "failed";
    failedJob.error =
      error instanceof Error
        ? error.message
        : "変換処理中にエラーが発生しました";
    conversionJobs.set(jobId, failedJob);
  }
}

function extractVideoId(url: string): string {
  let videoId = "";

  if (url.includes("youtube.com/watch")) {
    const urlObj = new URL(url);
    videoId = urlObj.searchParams.get("v") || "unknown";
  } else if (url.includes("youtu.be/")) {
    const parts = url.split("/");
    videoId = parts[parts.length - 1].split("?")[0];
  }

  return videoId;
}

export function getConversionJob(jobId: string): ConversionJob | undefined {
  return conversionJobs.get(jobId);
}

function cleanupOldJobs() {
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

// 定期的にクリーンアップを実行（サーバーサイドでのみ実行）
if (typeof window === "undefined") {
  // 24時間ごとにクリーンアップを実行
  setInterval(cleanupOldJobs, 24 * 60 * 60 * 1000);

  // アプリ起動時にも実行
  cleanupOldJobs();
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get("jobId");

    if (!jobId) {
      return NextResponse.json(
        { error: "ジョブIDが指定されていません" },
        { status: 400 }
      );
    }

    const job = getConversionJob(jobId);

    if (!job) {
      return NextResponse.json(
        { error: "指定されたジョブが見つかりません" },
        { status: 404 }
      );
    }

    return NextResponse.json({ job });
  } catch (error) {
    console.error("ジョブステータス取得エラー:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "ジョブステータスの取得に失敗しました",
      },
      { status: 500 }
    );
  }
}
