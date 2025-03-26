"use client";

import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t py-6 md:py-0">
      <div className="container flex flex-col items-center justify-between gap-4 md:h-14 md:flex-row">
        <p className="text-sm leading-loose text-center text-muted-foreground md:text-left">
          Built by{" "}
          <Link
            href="https://github.com/taross-f"
            target="_blank"
            rel="noreferrer"
            className="font-medium underline underline-offset-4"
          >
            taross-f
          </Link>
          . The source code is available on{" "}
          <Link
            href="https://github.com/taross-f/ytmp3-app"
            target="_blank"
            rel="noreferrer"
            className="font-medium underline underline-offset-4"
          >
            GitHub
          </Link>
          .
        </p>
      </div>
    </footer>
  );
}
