import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { YouTubeUrlForm } from "@/components/YouTubeUrlForm";

export default function Home() {
  return (
    <div className="container flex flex-col items-center justify-center min-h-[calc(100vh-8rem)] py-8">
      <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
        <Card>
          <CardHeader>
            <CardTitle>YouTube to MP3</CardTitle>
            <CardDescription>
              YouTubeの動画をMP3形式に変換します。
            </CardDescription>
          </CardHeader>
          <CardContent>
            <YouTubeUrlForm />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
