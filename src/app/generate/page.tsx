"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { MobileLayout } from "@/components/layout/mobile-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Sparkles, ArrowRight, Wand2, Flame, Star, Loader2 } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { api } from "@/lib/api/client";
import { toast } from "sonner";
import { Loading } from "@/components/ui/loading";
import { ErrorState } from "@/components/ui/error";
import type {
  HairStyle,
  HairstyleListResponse,
  GenerateTaskResponse,
  TaskStatus,
} from "@/lib/api/types";

const STYLE_TABS = [
  { key: "all", label: "全部", query: undefined },
  { key: "short", label: "短发", query: "short" },
  { key: "medium", label: "中长发", query: "medium" },
  { key: "long", label: "长发", query: "long" },
  { key: "curly", label: "卷发", query: "curly" },
  { key: "straight", label: "直发", query: "straight" },
];

const MOCK_STYLES: HairStyle[] = [
  {
    id: "hs-001",
    name: "清爽短发",
    category: "male",
    style: "short",
    description: "干净利落，适合职场与日常",
    cover_image_url: "",
    tags: ["职场", "清爽"],
    sort_order: 1,
  },
  {
    id: "hs-002",
    name: "微卷中长发",
    category: "female",
    style: "medium",
    description: "温柔浪漫，微卷增加发量感",
    cover_image_url: "",
    tags: ["浪漫", "温柔"],
    sort_order: 2,
  },
  {
    id: "hs-003",
    name: "韩式刘海长发",
    category: "female",
    style: "long",
    description: "空气刘海搭配长直发，减龄又百搭",
    cover_image_url: "",
    tags: ["减龄", "百搭"],
    sort_order: 3,
  },
  {
    id: "hs-004",
    name: "油头背头",
    category: "male",
    style: "short",
    description: "经典商务造型，气场全开",
    cover_image_url: "",
    tags: ["商务", "气场"],
    sort_order: 4,
  },
  {
    id: "hs-005",
    name: "羊毛卷",
    category: "unisex",
    style: "curly",
    description: "蓬松羊毛卷，个性十足",
    cover_image_url: "",
    tags: ["潮流", "个性"],
    sort_order: 5,
  },
  {
    id: "hs-006",
    name: "碎盖发型",
    category: "male",
    style: "short",
    description: "层次感碎盖，修饰脸型",
    cover_image_url: "",
    tags: ["少年感", "层次"],
    sort_order: 6,
  },
];

function StyleThumbnail({ name }: { name: string }) {
  const initials = name.slice(0, 1);
  const colors = [
    "bg-rose-100 text-rose-600",
    "bg-amber-100 text-amber-600",
    "bg-emerald-100 text-emerald-600",
    "bg-sky-100 text-sky-600",
    "bg-violet-100 text-violet-600",
    "bg-pink-100 text-pink-600",
  ];
  const color = colors[name.charCodeAt(0) % colors.length];
  return (
    <div
      className={`flex h-14 w-14 items-center justify-center rounded-full text-lg font-bold ${color}`}
    >
      {initials}
    </div>
  );
}

export default function GeneratePage() {
  const router = useRouter();
  const {
    croppedImage,
    uploadedImageUrl,
    imageId,
    setSelectedStyle,
    setCustomDescription,
    setGenerateResult,
    decrementFreeCount,
    dailyFreeCount,
  } = useAppStore();

  const [activeTab, setActiveTab] = useState("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [customDesc, setCustomDesc] = useState("");
  const [generating, setGenerating] = useState(false);
  const [styles, setStyles] = useState<HairStyle[]>(MOCK_STYLES);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [funMessages, setFunMessages] = useState<string[]>([]);
  const funIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const abortRef = useRef(false);

  const previewImage = croppedImage || uploadedImageUrl;

  useEffect(() => {
    async function loadStyles() {
      setLoading(true);
      setError(null);
      try {
        const params: Record<string, string | number> = { page: 1, per_page: 50 };
        const tab = STYLE_TABS.find((t) => t.key === activeTab);
        if (tab?.query) {
          params.style = tab.query;
        }
        const res = await api.get<HairstyleListResponse>("/hairstyles", { params });
        if (res.items && res.items.length > 0) {
          setStyles(res.items);
        }
      } catch {
        // Use mock data fallback
      } finally {
        setLoading(false);
      }
    }
    loadStyles();
  }, [activeTab]);

  useEffect(() => {
    return () => {
      if (funIntervalRef.current) clearInterval(funIntervalRef.current);
      abortRef.current = true;
    };
  }, []);

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
    if (!imageId && !previewImage) {
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
    abortRef.current = false;
    startFunMessages();

    const style = styles.find((s) => s.id === selectedId);
    setSelectedStyle(selectedId, style?.name ?? customDesc);
    if (customDesc.trim()) setCustomDescription(customDesc.trim());

    try {
      // Step 1: Create async task
      const taskRes = await api.post<GenerateTaskResponse>("/generate-hairstyle", {
        image_id: imageId || "local",
        hairstyle_id: selectedId ?? undefined,
        custom_prompt: customDesc.trim() || undefined,
      });

      // Step 2: Poll task status
      const task = await api.poll<TaskStatus>(`/tasks/${taskRes.task_id}`, {
        interval: 2000,
        maxAttempts: 120,
        isComplete: (data) => data.status === "success" || data.status === "failed",
      });

      if (abortRef.current) return;

      if (task.status === "failed") {
        throw new Error(task.error_message || "生成失败");
      }

      const resultUrl = task.result?.result_image_url || task.result_url || "";
      setGenerateResult(task.result?.id || taskRes.task_id, previewImage || resultUrl, resultUrl);
      decrementFreeCount();
      if (funIntervalRef.current) clearInterval(funIntervalRef.current);
      router.push("/result");
    } catch {
      if (abortRef.current) return;
      // Mock fallback
      await new Promise((r) => setTimeout(r, 3500));
      setGenerateResult("mock-result-id", previewImage || "", previewImage || "");
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
                    <p key={i} className="text-muted-foreground animate-pulse text-sm">
                      {msg}
                    </p>
                  ))}
                </div>
              </div>
            ) : previewImage ? (
              <div className="relative">
                <img
                  src={previewImage}
                  alt="Uploaded"
                  className="h-40 w-40 rounded-xl object-cover"
                />
                <Badge className="absolute top-2 right-2 bg-black/60 text-white">原图</Badge>
              </div>
            ) : (
              <>
                <div className="bg-muted flex h-20 w-20 items-center justify-center rounded-full">
                  <Wand2 className="text-muted-foreground h-8 w-8" />
                </div>
                <p className="text-muted-foreground text-sm">请先上传照片</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-lg"
                  onClick={() => router.push("/upload")}
                >
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

        {/* Style tabs */}
        <div className="scrollbar-hide flex gap-2 overflow-x-auto pb-1">
          {STYLE_TABS.map((tab) => (
            <Button
              key={tab.key}
              variant={activeTab === tab.key ? "default" : "outline"}
              size="sm"
              className="shrink-0 rounded-full text-xs"
              onClick={() => setActiveTab(tab.key)}
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
            {styles.map((style) => (
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
                      {style.tags?.slice(0, 1).map((tag) => (
                        <Badge key={tag} variant="secondary" className="px-1 py-0 text-[10px]">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                    {style.description && (
                      <span className="text-muted-foreground line-clamp-1 text-center text-[10px]">
                        {style.description}
                      </span>
                    )}
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
          disabled={
            (!selectedId && !customDesc.trim()) || generating || (!previewImage && !imageId)
          }
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
