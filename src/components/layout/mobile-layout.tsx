"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Upload, User, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "/", label: "首页", icon: Home },
  { href: "/upload", label: "上传", icon: Upload },
  { href: "/generate", label: "生成", icon: Sparkles },
  { href: "/profile", label: "我的", icon: User },
];

export function MobileLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="bg-background relative mx-auto flex min-h-full max-w-[428px] flex-col">
      <main className="safe-top safe-bottom flex-1 overflow-y-auto pb-16">{children}</main>
      <nav className="bg-background/80 safe-bottom fixed right-0 bottom-0 left-0 z-50 border-t backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-[428px] items-center justify-around">
          {tabs.map((tab) => {
            const active = pathname === tab.href;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={cn(
                  "flex w-16 flex-col items-center justify-center gap-0.5 text-xs transition-colors",
                  active ? "text-primary" : "text-muted-foreground"
                )}
              >
                <tab.icon className="h-5 w-5" />
                <span>{tab.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
