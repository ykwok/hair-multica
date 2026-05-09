"use client";

import { MobileLayout } from "@/components/layout/mobile-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Sparkles, Share2, RotateCcw, MessageCircle, Star } from "lucide-react";
import { useRouter } from "next/navigation";

export default function ResultPage() {
  const router = useRouter();

  return (
    <MobileLayout>
      <div className="flex flex-col gap-5 p-4">
        <section className="flex flex-col gap-2">
          <h1 className="text-xl font-bold">生成结果</h1>
          <p className="text-muted-foreground text-sm">AI 为你生成的发型效果图</p>
        </section>

        {/* Result image */}
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-6">
            <div className="bg-muted flex h-56 w-56 items-center justify-center rounded-xl">
              <Sparkles className="text-muted-foreground h-16 w-16" />
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">波浪卷发</Badge>
              <Badge variant="outline">AI 生成</Badge>
            </div>
          </CardContent>
        </Card>

        {/* AI Comment */}
        <Card>
          <CardContent className="flex flex-col gap-4 p-4">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-primary/10 text-primary text-sm">AI</AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-medium">AI 造型师</p>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star key={s} className="fill-primary text-primary h-3 w-3" />
                  ))}
                  <span className="text-muted-foreground ml-1 text-xs">5.0</span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="bg-muted rounded-lg p-3">
                <p className="text-muted-foreground mb-1 text-xs font-medium">脸型分析</p>
                <p className="text-sm">
                  鹅蛋脸，五官立体，非常适合尝试波浪卷发，能够很好地修饰脸型轮廓。
                </p>
              </div>
              <div className="bg-muted rounded-lg p-3">
                <p className="text-muted-foreground mb-1 text-xs font-medium">造型点评</p>
                <p className="text-sm">
                  这款波浪卷为你增添了柔美气质，卷度自然不做作，日常打理也很方便。
                </p>
              </div>
              <div className="bg-muted rounded-lg p-3">
                <p className="text-muted-foreground mb-1 text-xs font-medium">造型建议</p>
                <p className="text-sm">
                  建议搭配暖棕色系，会让整体效果更加出众。日常可以使用弹力素保持卷度。
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="grid grid-cols-2 gap-3">
          <Button
            variant="outline"
            className="h-12 rounded-xl"
            onClick={() => router.push("/upload")}
          >
            <RotateCcw className="mr-2 h-5 w-5" />
            重新上传
          </Button>
          <Button className="h-12 rounded-xl" onClick={() => router.push("/share")}>
            <Share2 className="mr-2 h-5 w-5" />
            分享长图
          </Button>
        </div>

        <Button
          variant="ghost"
          className="h-12 w-full rounded-xl"
          onClick={() => router.push("/generate")}
        >
          <MessageCircle className="mr-2 h-5 w-5" />
          尝试其他发型
        </Button>
      </div>
    </MobileLayout>
  );
}
