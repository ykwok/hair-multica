"use client";

import { Inbox } from "lucide-react";

interface EmptyProps {
  message?: string;
  description?: string;
}

export function Empty({ message = "暂无数据", description }: EmptyProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-12">
      <Inbox className="text-muted-foreground/60 h-10 w-10" />
      <p className="text-muted-foreground text-sm font-medium">{message}</p>
      {description && <p className="text-muted-foreground/70 text-xs">{description}</p>}
    </div>
  );
}
