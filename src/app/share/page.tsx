"use client";

import { MobileLayout } from "@/components/layout/mobile-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Sparkles, Download, Share2, Copy } from "lucide-react";

export default function SharePage() {
  return (
    <MobileLayout>
      <div className="flex flex-col gap-6 p-4">
        <section className="flex flex-col gap-2">
          <h1 className="text-xl font-bold">分享长图</h1>
          <p className="text-muted-foreground text-sm">生成精美的分享卡片，分享给好友</p>
        </section>

        {/* Share card preview */}
        <Card className="border-primary/20 overflow-hidden border-2">
          <CardContent className="flex flex-col gap-4 p-0">
            <div className="from-primary/5 to-primary/20 flex flex-col items-center gap-3 bg-gradient-to-br p-4">
              <div className="flex h-48 w-48 items-center justify-center rounded-xl bg-white shadow-sm">
                <Sparkles className="text-muted-foreground h-16 w-16" />
              </div>
              <div className="text-center">
                <h3 className="text-lg font-bold">我的 AI 发型</h3>
                <p className="text-muted-foreground mt-1 text-xs">发型宇宙 · AI 换发型</p>
              </div>
            </div>
            <div className="px-4 pb-4">
              <div className="bg-muted rounded-lg p-3">
                <p className="text-sm">
                  &ldquo;这款波浪卷太适合我了，AI 造型师的点评也很专业！&rdquo;
                </p>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="bg-primary/10 flex h-8 w-8 items-center justify-center rounded-full">
                    <Sparkles className="text-primary h-4 w-4" />
                  </div>
                  <span className="text-muted-foreground text-xs">扫码体验同款</span>
                </div>
                <div className="bg-muted flex h-10 w-10 items-center justify-center rounded-lg">
                  <Sparkles className="text-muted-foreground h-5 w-5" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-3 gap-3">
          <Button variant="outline" className="h-auto flex-col gap-1 rounded-xl py-3">
            <Download className="h-5 w-5" />
            <span className="text-xs">保存图片</span>
          </Button>
          <Button variant="outline" className="h-auto flex-col gap-1 rounded-xl py-3">
            <Copy className="h-5 w-5" />
            <span className="text-xs">复制链接</span>
          </Button>
          <Button variant="outline" className="h-auto flex-col gap-1 rounded-xl py-3">
            <Share2 className="h-5 w-5" />
            <span className="text-xs">分享给好友</span>
          </Button>
        </div>
      </div>
    </MobileLayout>
  );
}
