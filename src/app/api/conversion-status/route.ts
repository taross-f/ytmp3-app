import { NextResponse, NextRequest } from "next/server";
import { z } from "zod";

const requestSchema = z.object({
  jobId: z.string().uuid(),
});

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const jobId = url.searchParams.get("jobId");

    if (!jobId) {
      return NextResponse.json(
        { error: "ジョブIDが指定されていません" },
        { status: 400 }
      );
    }

    requestSchema.parse({ jobId });

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

    return NextResponse.json({
      status: job.status,
      progress: job.progress,
      error: job.error,
      result: job.result,
    });
  } catch (error) {
    console.error("変換状態の取得に失敗:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "変換状態の取得に失敗しました",
      },
      { status: 400 }
    );
  }
}
