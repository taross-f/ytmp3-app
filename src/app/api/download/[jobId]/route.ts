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

    // Content-Typeの適切な設定
    let contentType = "application/octet-stream"; // デフォルト
    if (job.result.fileName.endsWith(".mp3")) {
      contentType = "audio/mpeg";
    } else if (job.result.fileName.endsWith(".mp4")) {
      contentType = "video/mp4";
    }

    // ダウンロードではなく直接再生を可能にするために、Content-Dispositionを調整
    const contentDisposition =
      request.headers.get("x-content-disposition") === "inline"
        ? `inline; filename="${job.result.fileName}"`
        : `attachment; filename="${job.result.fileName}"`;

    return new NextResponse(fileData, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": contentDisposition,
        "Content-Length": fileData.length.toString(),
        "Accept-Ranges": "bytes",
        "Cache-Control": "public, max-age=3600",
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
