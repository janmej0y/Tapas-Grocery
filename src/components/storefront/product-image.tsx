"use client";

import Image from "next/image";
import { useState } from "react";
import { ImageOff } from "lucide-react";
import { cn } from "@/lib/cn";

type ProductImageProps = {
  src: string | undefined;
  alt: string;
  width: number;
  height: number;
  className?: string;
  priority?: boolean;
};

export function ProductImage({ alt, className, height, priority, src, width }: ProductImageProps) {
  const [status, setStatus] = useState<"loading" | "ready" | "error">(src ? "loading" : "error");

  if (status === "error") {
    return (
      <div className="grid h-full w-full place-items-center text-slate-300">
        <ImageOff className="h-10 w-10" aria-hidden="true" />
      </div>
    );
  }

  return (
    <>
      {status === "loading" ? <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-slate-100 via-white to-slate-100" /> : null}
      <Image
        src={src as string}
        alt={alt}
        width={width}
        height={height}
        priority={priority}
        className={cn(
          "object-contain drop-shadow-sm transition duration-200",
          status === "ready" ? "opacity-100" : "opacity-0",
          className
        )}
        onLoad={() => setStatus("ready")}
        onError={() => setStatus("error")}
      />
    </>
  );
}
