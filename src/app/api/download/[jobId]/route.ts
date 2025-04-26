import { NextResponse } from "next/server";
import fs from "fs";
import { promisify } from "util";

const readFileAsync = promisify(fs.readFile);

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const segments = url.pathname.split("/");
    const jobId = segments[segments.length - 1];

    if (!jobId) {
      return NextResponse.json(
        { error: "ジョブIDが指定されていません" },
        { status: 400 }
      );
    }

    // 変換ジョブの情報を取得
    const host = request.headers.get("host") || "localhost:3000";
    const protocol = host.includes("localhost") ? "http" : "https";
    const jobResponse = await fetch(
      `${protocol}://${host}/api/convert?jobId=${jobId}`
    );

    if (!jobResponse.ok) {
      return NextResponse.json(
        { error: "指定されたジョブが見つかりません" },
        { status: 404 }
      );
    }

    const { job } = await jobResponse.json();

    if (
      job.status !== "completed" ||
      !job.result?.fileName ||
      !job.result?.filePath
    ) {
      return NextResponse.json(
        { error: "変換が完了していないか、ファイルが利用できません" },
        { status: 400 }
      );
    }

    if (!fs.existsSync(job.result.filePath)) {
      return NextResponse.json(
        { error: "ファイルが見つかりません" },
        { status: 404 }
      );
    }

    const fileData = await readFileAsync(job.result.filePath);
    
    const contentType = job.result.fileName.endsWith('.mp3') 
                      ? "audio/mpeg" 
                      : "video/mp4";

    return new NextResponse(fileData, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${job.result.fileName}"`,
        "Content-Length": fileData.length.toString(),
      },
    });
  } catch (error) {
    console.error("ダウンロードエラー:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "ファイルのダウンロードに失敗しました",
      },
      { status: 500 }
    );
  }
}
