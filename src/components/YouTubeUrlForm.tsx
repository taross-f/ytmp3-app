"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

const formSchema = z.object({
  url: z
    .string()
    .min(1, "URLを入力してください")
    .url("有効なURLを入力してください")
    .refine(
      (url) => {
        const youtubeRegex =
          /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+$/;
        return youtubeRegex.test(url);
      },
      {
        message: "YouTubeのURLを入力してください",
      }
    ),
});

export function YouTubeUrlForm() {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      url: "",
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    toast.info("変換を開始します...");
    // TODO: 変換処理の実装
    console.log(values);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="url"
          render={({ field }) => (
            <FormItem>
              <FormLabel>YouTube URL</FormLabel>
              <FormControl>
                <Input
                  placeholder="https://www.youtube.com/watch?v=..."
                  {...field}
                />
              </FormControl>
              <FormDescription>
                変換したいYouTube動画のURLを入力してください
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full">
          MP3に変換
        </Button>
      </form>
    </Form>
  );
}
