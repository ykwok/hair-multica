"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { MobileLayout } from "@/components/layout/mobile-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Sparkles, ArrowRight, Wand2, MessageSquare, Scissors, Flame, Star, Loader2 } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { api } from "@/lib/api/client";
import { toast } from "sonner";
import { Loading } from "@/components/ui/loading";
import { ErrorState } from "@/components/ui/error";
import type { HairStyle, GenerateResult } from "@/lib/api/types";

const CATEGORY_TABS = [
  { key: "all", label: "全部" },
  { key: "short", label: "短发" },
  { key: "medium", label: "中长发" },
  { key: "long", label: "长发" },
  { key: "curly", label: "卷发" },
  { key: "straight", label: "直发" },
  { key: "bangs", label: "刘海" },
  { key: "celebrity", label: "明星同款" },
];

const MOCK_STYLES: HairStyle[] = [
  { id: "1", name: "清爽短发", category: "short", thumbnailUrl: "", popularity: 95, faceShapes: ["圆脸", "鹅蛋脸"], tags: ["热门"] },
  { id: "2", name: "波浪卷发", category: "curly", thumbnailUrl: "", popularity: 92, faceShapes: ["长脸", "方脸"], tags: ["推荐"] },
  { id: "3", name: "中长发", category: "medium", thumbnailUrl: "", popularity: 88, faceShapes: ["鹅蛋脸", "心形脸"], tags: [] },
  { id: "4", name: "黑长直", category: "long", thumbnailUrl: "", popularity: 85, faceShapes: ["鹅蛋脸", "长脸"], tags: [] },
  { id: "5", name: "法式刘海", category: "bangs", thumbnailUrl: "", popularity: 90, faceShapes: ["圆脸", "方脸"], tags: ["新品"] },
  { id: "6", name: "韩式卷发", category: "curly", thumbnailUrl: "", popularity: 87, faceShapes: ["鹅蛋脸", "圆脸"], tags: [] },
  { id: "7", name: "一刀切", category: "short", thumbnailUrl: "", popularity: 93, faceShapes: ["方脸", "长脸"], tags: ["热门"] },
  { id: "8", name: "羊毛卷", category: "curly", thumbnailUrl: "", popularity: 80, faceShapes: ["圆脸", "鹅蛋脸"], tags: [] },
  { id: "9", name: "锁骨发", category: "medium", thumbnailUrl: "", popularity: 91, faceShapes: ["心形脸", "鹅蛋脸"], tags: ["推荐"] },
  { id: "10", name: "空气刘海", category: "bangs", thumbnailUrl: "", popularity: 89, faceShapes: ["长脸", "心形脸"], tags: [] },
  { id: "11", name: "高层次长发", category: "long", thumbnailUrl: "", popularity: 84, faceShapes: ["圆脸", "方脸"], tags: [] },
  { id: "12", name: "Lisa 同款", category: "celebrity", thumbnailUrl: "", popularity: 96, faceShapes: ["鹅蛋脸", "圆脸"], tags: ["明星"] },
];

function StyleThumbnail({ name }: { name: string }) {
  const initials = name.slice(0, 1);
  const colors = ["bg-rose-100 text-rose-600", "bg-amber-100 text-amber-600", "bg-emerald-100 text-emerald-600", "bg-sky-100 text-sky-600", "bg-violet-100 text-violet-600", "bg-pink-100 text-pink-600"];
  const color = colors[name.charCodeAt(0) % colors.length];
  return (
    <div className={`flex h-14 w-14 items-center justify-center rounded-full text-lg font-bold ${color}`}>
      {initials}
    </div>
  );
}

export default function GeneratePage() {
  const router = useRouter();
  const { croppedImage, uploadedImageUrl, setSelectedStyle, setCustomDescription, setGenerateResult, decrementFreeCount, dailyFreeCount } = useAppStore();

  const [activeCategory, setActiveCategory] = useState("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [customDesc, setCustomDesc] = useState("");
  const [generating, setGenerating] = useState(false);
  const [styles, setStyles] = useState<HairStyle[]>(MOCK_STYLES);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [funMessages, setFunMessages] = useState<string[]>([]);
  const funIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const previewImage = croppedImage || uploadedImageUrl;

  useEffect(() => {
    async function loadStyles() {
      setLoading(true);
      setError(null);
      try {
        const res = await api.get<{ data: HairStyle[] }>("/v1/hairstyles", { params: { page: 1, pageSize: 50 } });
        if (res.data && res.data.length > 0) {
          setStyles(res.data);
        }
      } catch {
        // Use mock data fallback
      } finally {
        setLoading(false);
      }
    }
    loadStyles();
  }, []);

  useEffect(() => {
    return () => {
      if (funIntervalRef.current) clearInterval(funIntervalRef.current);
    };
  }, []);

  const filteredStyles = activeCategory === "all" ? styles : styles.filter((s) => s.category === activeCategory);

  const startFunMessages = () => {
    const messages = [
      "AI 造型师正在为你换发型...",
      "正在分析你的面部轮廓...",
      "正在匹配最佳发型...",
      "正在渲染效果图...",
      "即将完成，请稍候...",
    ];
    let idx = 0;
    setFunMessages([messages[0]]);
    funIntervalRef.current = setInterval(() => {
      idx++;
      if (idx < messages.length) {
        setFunMessages((prev) => [...prev, messages[idx]]);
      }
    }, 1800);
  };

  const handleGenerate = async () => {
    if (!previewImage) {
      toast.error("请先上传照片");
      router.push("/upload");
      return;
    }
    if (!selectedId && !customDesc.trim()) {
      toast.error("请选择发型或输入描述");
      return;
    }
    if (dailyFreeCount <= 0) {
      toast.error("今日免费次数已用完，分享可解锁额外次数");
      return;
    }

    setGenerating(true);
    startFunMessages();

    const style = styles.find((s) => s.id === selectedId);
    setSelectedStyle(selectedId, style?.name ?? customDesc);
    if (customDesc.trim()) setCustomDescription(customDesc.trim());

    try {
      const res = await api.post<GenerateResult>("/v1/generate-hairstyle", {
        imageUrl: uploadedImageUrl || previewImage,
        targetStyleId: selectedId ?? undefined,
        customDescription: customDesc.trim() || undefined,
      });

      setGenerateResult(res.id, res.originalImageUrl, res.generatedImageUrl);
      decrementFreeCount();
      if (funIntervalRef.current) clearInterval(funIntervalRef.current);
      router.push("/result");
    } catch {
      // Mock fallback
      await new Promise((r) => setTimeout(r, 3500));
      setGenerateResult(
        "mock-result-id",
        previewImage,
        previewImage
      );
      decrementFreeCount();
      if (funIntervalRef.current) clearInterval(funIntervalRef.current);
      router.push("/result");
    }
  };

  return (
    <MobileLayout>
      <div className="flex flex-col gap-5 p-4">
        <section className="flex flex-col gap-2">
          <h1 className="text-xl font-bold">选择发型</h1>
          <p className="text-muted-foreground text-sm">挑选你喜欢的发型，AI 将为你生成效果图</p>
        </section>

        {/* Preview */}
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-5">
            {generating ? (
              <div className="flex w-full flex-col items-center gap-4 py-4">
                <div className="bg-primary/10 flex h-20 w-20 items-center justify-center rounded-full">
                  <Loader2 className="text-primary h-10 w-10 animate-spin" />
                </div>
                <div className="flex flex-col items-center gap-1">
                  {funMessages.slice(-1).map((msg, i) => (
                    <p key={i} className="text-muted-foreground animate-pulse text-sm">{msg}</p>
                  ))}
                </div>
              </div>
            ) : previewImage ? (
              <div className="relative">
                <img src={previewImage} alt="Uploaded" className="h-40 w-40 rounded-xl object-cover" />
                <Badge className="absolute top-2 right-2 bg-black/60 text-white">原图</Badge>
              </div>
            ) : (
              <>
                <div className="bg-muted flex h-20 w-20 items-center justify-center rounded-full">
                  <Wand2 className="text-muted-foreground h-8 w-8" />
                </div>
                <p className="text-muted-foreground text-sm">请先上传照片</p>
                <Button variant="outline" size="sm" className="rounded-lg" onClick={() => router.push("/upload")}>
                  去上传
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        {/* Custom description */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium">用文字描述你想要的发型</label>
          <div className="flex gap-2">
            <Input
              placeholder="例如：蓬松微卷的锁骨发，带有法式刘海"
              value={customDesc}
              onChange={(e) => setCustomDesc(e.target.value)}
              className="rounded-xl"
              disabled={generating}
            />
            <Button
              variant="secondary"
              size="icon"
              className="shrink-0 rounded-xl"
              disabled={generating || !customDesc.trim()}
              onClick={() => {
                setSelectedId(null);
                handleGenerate();
              }}
            >
              <Sparkles className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Category tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {CATEGORY_TABS.map((tab) => (
            <Button
              key={tab.key}
              variant={activeCategory === tab.key ? "default" : "outline"}
              size="sm"
              className="shrink-0 rounded-full text-xs"
              onClick={() => setActiveCategory(tab.key)}
              disabled={generating}
            >
              {tab.label}
            </Button>
          ))}
        </div>

        {/* Style grid */}
        {loading ? (
          <Loading message="加载发型库..." />
        ) : error ? (
          <ErrorState message={error} onRetry={() => setLoading(true)} />
        ) : (
          <section className="grid grid-cols-2 gap-3">
            {filteredStyles.map((style) => (
              <Card
                key={style.id}
                className={`cursor-pointer transition-all ${
                  selectedId === style.id
                    ? "border-primary ring-primary/20 ring-2"
                    : "hover:shadow-sm"
                }`}
                onClick={() => {
                  if (generating) return;
                  setSelectedId(style.id);
                  setCustomDesc("");
                }}
              >
                <CardContent className="flex flex-col items-center gap-2 p-3">
                  <StyleThumbnail name={style.name} />
                  <div className="flex flex-col items-center gap-1">
                    <div className="flex items-center gap-1">
                      <span className="text-sm font-medium">{style.name}</span>
                      {style.tags?.map((tag) => (
                        <Badge key={tag} variant="secondary" className="px-1 py-0 text-[10px]">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                    <div className="flex flex-wrap justify-center gap-1">
                      {style.faceShapes?.map((shape) => (
                        <span key={shape} className="text-muted-foreground text-[10px]">{shape}</span>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </section>
        )}

        {/* Free count */}
        <div className="text-muted-foreground flex items-center justify-center gap-1 text-xs">
          <Flame className="h-3 w-3 text-orange-500" />
          今日剩余免费次数：{dailyFreeCount} 次
        </div>

        <Button
          className="h-12 w-full rounded-xl"
          size="lg"
          disabled={(!selectedId && !customDesc.trim()) || generating || !previewImage}
          onClick={handleGenerate}
        >
          {generating ? (
            "AI 生成中..."
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
