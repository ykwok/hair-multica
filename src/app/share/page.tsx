"use client";

import { useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toPng } from "html-to-image";
import { MobileLayout } from "@/components/layout/mobile-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAppStore } from "@/lib/store";
import { toast } from "sonner";
import { Sparkles, Download, Copy, Share2, Check, Unlock, ArrowLeft, Star } from "lucide-react";
import { Loading } from "@/components/ui/loading";

export default function SharePage() {
  const router = useRouter();
  const { generatedImageUrl, selectedStyleName, aiComment, dailyFreeCount } = useAppStore();
  const cardRef = useRef<HTMLDivElement>(null);
  const [capturing, setCapturing] = useState(false);
  const [shared, setShared] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleCapture = useCallback(async () => {
    if (!cardRef.current) return;
    setCapturing(true);
    try {
      const dataUrl = await toPng(cardRef.current, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: "#ffffff",
      });
      const link = document.createElement("a");
      link.download = `发型宇宙-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
      setSaved(true);
      toast.success("图片已保存");
    } catch {
      toast.error("保存失败，请重试");
    } finally {
      setCapturing(false);
    }
  }, []);

  const handleCopyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success("链接已复制");
    } catch {
      toast.error("复制失败");
    }
  }, []);

  const handleShare = useCallback(() => {
    if (navigator.share) {
      navigator
        .share({
          title: "发型宇宙 - AI 换发型",
          text: `我在发型宇宙尝试了「${selectedStyleName || "AI 发型"}」，快来看看！`,
          url: window.location.origin,
        })
        .catch(() => {
          // user cancelled
        });
    } else {
      handleCopyLink();
    }
    setShared(true);
    toast.success("分享成功！解锁额外 1 次免费生成机会");
  }, [selectedStyleName, handleCopyLink]);

  const beforeImg = generatedImageUrl || "";
  const comment = aiComment;

  if (!generatedImageUrl) {
    return (
      <MobileLayout>
        <div className="flex flex-col items-center justify-center gap-4 px-4 py-20">
          <Sparkles className="text-muted-foreground h-12 w-12" />
          <p className="text-muted-foreground text-sm">还没有生成结果</p>
          <Button className="rounded-xl" onClick={() => router.push("/upload")}>
            去上传照片
          </Button>
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout>
      <div className="flex flex-col gap-5 p-4">
        <section className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full"
            onClick={() => router.push("/result")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex flex-col gap-1">
            <h1 className="text-xl font-bold">分享长图</h1>
            <p className="text-muted-foreground text-sm">生成精美的分享卡片，分享给好友</p>
          </div>
        </section>

        {/* Share Card (capture target) */}
        <div ref={cardRef} className="overflow-hidden rounded-2xl border bg-white shadow-sm">
          <div className="from-primary/10 to-primary/5 flex flex-col items-center gap-4 bg-gradient-to-br p-5">
            {/* Result image */}
            <div className="relative overflow-hidden rounded-xl border-2 border-white shadow-lg">
              <img
                src={beforeImg}
                alt="AI Hairstyle"
                className="h-56 w-56 object-cover"
                crossOrigin="anonymous"
              />
              <Badge className="absolute top-2 right-2 bg-black/60 text-white hover:bg-black/60">
                {selectedStyleName || "AI 发型"}
              </Badge>
            </div>

            {/* Title */}
            <div className="text-center">
              <h3 className="text-xl font-bold text-gray-900">我的 AI 发型</h3>
              <p className="mt-1 text-sm text-gray-500">发型宇宙 · AI 换发型</p>
            </div>
          </div>

          {/* AI Comment preview */}
          <div className="p-5">
            {comment && (
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <div className="bg-primary/10 flex h-8 w-8 items-center justify-center rounded-full">
                    <Sparkles className="text-primary h-4 w-4" />
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-sm font-medium text-gray-900">AI 造型师</span>
                    <div className="flex items-center gap-0.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`h-3 w-3 ${
                            i < Math.round(comment.overallScore / 20)
                              ? "fill-amber-400 text-amber-400"
                              : "text-gray-300"
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                <div className="rounded-xl bg-gray-50 p-3">
                  <p className="text-sm leading-relaxed text-gray-700">
                    &ldquo;{comment.comments[0]?.content || "AI 造型师的精彩点评"}&rdquo;
                  </p>
                </div>

                {comment.suggestions.length > 0 && (
                  <div className="rounded-xl bg-amber-50 p-3">
                    <p className="mb-1 text-xs font-medium text-amber-700">💡 造型建议</p>
                    <p className="text-xs text-amber-800">{comment.suggestions[0]}</p>
                  </div>
                )}
              </div>
            )}

            {/* Footer */}
            <div className="mt-4 flex items-center justify-between border-t pt-4">
              <div className="flex items-center gap-2">
                <div className="bg-primary/10 flex h-8 w-8 items-center justify-center rounded-full">
                  <Sparkles className="text-primary h-4 w-4" />
                </div>
                <span className="text-xs text-gray-500">扫码体验同款</span>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100">
                <Sparkles className="h-5 w-5 text-gray-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Unlock banner */}
        {shared ? (
          <div className="flex items-center gap-3 rounded-xl bg-green-50 p-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100">
              <Unlock className="h-4 w-4 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-green-800">分享成功！</p>
              <p className="text-xs text-green-600">已解锁额外 1 次免费生成机会</p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 rounded-xl bg-amber-50 p-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100">
              <Unlock className="h-4 w-4 text-amber-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-amber-800">分享解锁</p>
              <p className="text-xs text-amber-600">分享后可解锁额外 1 次免费生成机会</p>
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="grid grid-cols-3 gap-3">
          <Button
            variant="outline"
            className="h-auto flex-col gap-1 rounded-xl py-3"
            onClick={handleCapture}
            disabled={capturing}
          >
            {saved ? (
              <Check className="h-5 w-5 text-green-600" />
            ) : (
              <Download className="h-5 w-5" />
            )}
            <span className="text-xs">{saved ? "已保存" : "保存图片"}</span>
          </Button>
          <Button
            variant="outline"
            className="h-auto flex-col gap-1 rounded-xl py-3"
            onClick={handleCopyLink}
          >
            <Copy className="h-5 w-5" />
            <span className="text-xs">复制链接</span>
          </Button>
          <Button
            variant={shared ? "secondary" : "default"}
            className="h-auto flex-col gap-1 rounded-xl py-3"
            onClick={handleShare}
          >
            {shared ? <Check className="h-5 w-5" /> : <Share2 className="h-5 w-5" />}
            <span className="text-xs">{shared ? "已分享" : "分享给好友"}</span>
          </Button>
        </div>

        {capturing && <Loading message="正在生成长图..." />}
      </div>
    </MobileLayout>
  );
}
