"use client";

import { MobileLayout } from "@/components/layout/mobile-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Sparkles, ArrowRight } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";

const styles = [
  { id: "1", name: "清爽短发", category: "short" as const, tag: "热门" },
  { id: "2", name: "波浪卷发", category: "curly" as const, tag: "推荐" },
  { id: "3", name: "中长发", category: "medium" as const },
  { id: "4", name: "黑长直", category: "long" as const },
  { id: "5", name: "法式刘海", category: "short" as const },
  { id: "6", name: "韩式卷发", category: "curly" as const, tag: "新品" },
];

export default function GeneratePage() {
  const router = useRouter();
  const [selectedStyle, setSelectedStyle] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  const handleGenerate = () => {
    if (!selectedStyle) return;
    setGenerating(true);
    setTimeout(() => {
      router.push("/result");
    }, 1500);
  };

  return (
    <MobileLayout>
      <div className="flex flex-col gap-6 p-4">
        <section className="flex flex-col gap-2">
          <h1 className="text-xl font-bold">选择发型</h1>
          <p className="text-muted-foreground text-sm">挑选你喜欢的发型，AI 将为你生成效果图</p>
        </section>

        {/* Preview placeholder */}
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-2 py-8">
            {generating ? (
              <div className="flex w-full flex-col items-center gap-3">
                <Skeleton className="h-40 w-40 rounded-xl" />
                <p className="text-muted-foreground animate-pulse text-sm">AI 生成中...</p>
              </div>
            ) : (
              <>
                <div className="bg-muted flex h-24 w-24 items-center justify-center rounded-full">
                  <Sparkles className="text-muted-foreground h-10 w-10" />
                </div>
                <p className="text-muted-foreground text-sm">照片预览区域</p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Style grid */}
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-medium">推荐发型</h2>
          <div className="grid grid-cols-2 gap-3">
            {styles.map((style) => (
              <Card
                key={style.id}
                className={`cursor-pointer transition-all ${
                  selectedStyle === style.id
                    ? "border-primary ring-primary/20 ring-2"
                    : "hover:shadow-sm"
                }`}
                onClick={() => setSelectedStyle(style.id)}
              >
                <CardContent className="flex flex-col items-center gap-2 p-4">
                  <div className="bg-muted flex h-14 w-14 items-center justify-center rounded-full">
                    <Sparkles className="text-muted-foreground h-6 w-6" />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-medium">{style.name}</span>
                    {style.tag && (
                      <Badge variant="secondary" className="px-1 py-0 text-[10px]">
                        {style.tag}
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <Button
          className="h-12 w-full rounded-xl"
          size="lg"
          disabled={!selectedStyle || generating}
          onClick={handleGenerate}
        >
          {generating ? (
            "生成中..."
          ) : (
            <>
              <Sparkles className="mr-2 h-5 w-5" />
              开始生成
              <ArrowRight className="ml-2 h-5 w-5" />
            </>
          )}
        </Button>
      </div>
    </MobileLayout>
  );
}
