"use client";

import { Spinner } from "@/components/ui/spinner";

interface LoadingProps {
  message?: string;
}

export function Loading({ message = "加载中..." }: LoadingProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12">
      <Spinner className="text-primary h-8 w-8" />
      <p className="text-muted-foreground text-sm">{message}</p>
    </div>
  );
}
