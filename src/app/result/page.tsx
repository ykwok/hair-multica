"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { MobileLayout } from "@/components/layout/mobile-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ComparisonSlider } from "@/components/comparison-slider";
import { RadarChart } from "@/components/radar-chart";
import { useAppStore, type Personality } from "@/lib/store";
import { api } from "@/lib/api/client";
import { toast } from "sonner";
import {
  Share2,
  RotateCcw,
  MessageCircle,
  Star,
  Sparkles,
  Heart,
  Zap,
  BookOpen,
} from "lucide-react";
import { Loading } from "@/components/ui/loading";
import type { AIComment, AICommentRequest } from "@/lib/api/types";

const PERSONALITIES: { key: Personality; label: string; icon: React.ElementType; color: string }[] = [
  { key: "gentle", label: "温柔闺蜜", icon: Heart, color: "text-rose-500" },
  { key: "sarcastic", label: "毒舌造型师", icon: Zap, color: "text-amber-500" },
  { key: "knowledge", label: "知识型博主", icon: BookOpen, color: "text-sky-500" },
];

const MOCK_COMMENTS: Record<Personality, NonNullable<ReturnType<typeof useAppStore.getState>['aiComment']>> = {
  gentle: {
    id: "mock-1",
    resultId: "mock-result",
    overallScore: 92,
    faceShape: "鹅蛋脸",
    skinTone: "暖白皮",
    comments: [
      { category: "hairstyle", title: "脸型分析", content: "亲爱的，你的鹅蛋脸真的太适合这个发型了！卷度刚好修饰了颧骨，整个人看起来温柔又有气质~", emoji: "✨" },
      { category: "overall", title: "造型点评", content: "这款波浪卷为你增添了柔美气息，就像是春天里的一缕微风，让人忍不住多看几眼呢！", emoji: "🌸" },
      { category: "texture", title: "发质建议", content: "你的发质看起来偏细软，建议用大卷棒造型，喷一点定型喷雾就能保持一整天啦~", emoji: "💕" },
    ],
    suggestions: ["搭配暖棕色会更显白", "定期做发膜护理", "尝试侧分刘海"],
    createdAt: new Date().toISOString(),
    radarScores: { faceShapeMatch: 95, hairTextureMatch: 82, styleVibe: 90, emotionalValue: 96, proKnowledge: 75, humorInteraction: 88 },
  },
  sarcastic: {
    id: "mock-2",
    resultId: "mock-result",
    overallScore: 88,
    faceShape: "鹅蛋脸",
    skinTone: "暖白皮",
    comments: [
      { category: "hairstyle", title: "脸型分析", content: "鹅蛋脸？老天爷赏饭吃的那种。但你要是继续扎那个贴头皮马尾，神仙也救不了你。", emoji: "🙄" },
      { category: "overall", title: "造型点评", content: "这个波浪卷还行吧，比你之前的'刚睡醒'造型强个一百倍。至少看起来像是付得起房租的人了。", emoji: "💅" },
      { category: "texture", title: "发质建议", content: "你的头发细软到可以申请国家保护动物了。弹力素给我焊死在头上，懂？", emoji: "🔥" },
    ],
    suggestions: ["别再自己剪刘海了", "吹风机温度调低一档", "每个月至少修一次发尾"],
    createdAt: new Date().toISOString(),
    radarScores: { faceShapeMatch: 92, hairTextureMatch: 78, styleVibe: 88, emotionalValue: 70, proKnowledge: 85, humorInteraction: 95 },
  },
  knowledge: {
    id: "mock-3",
    resultId: "mock-result",
    overallScore: 90,
    faceShape: "鹅蛋脸",
    skinTone: "暖白皮",
    comments: [
      { category: "hairstyle", title: "脸型分析", content: "从面部黄金比例分析，你的面宽与面长比接近1:1.618，属于标准的鹅蛋脸。波浪卷的S型曲线在视觉上缩短了面长，符合三维美学中的'柔化轮廓'原理。", emoji: "📐" },
      { category: "overall", title: "造型点评", content: "这款发型的卷径约为32mm，属于中大卷范畴。根据2024年《国际发型美学报告》，这种卷度在东亚女性中的适配率高达87.3%。", emoji: "📊" },
      { category: "texture", title: "发质建议", content: "你的发丝直径约为60-70微米，属于细软发质。建议选用含 keratin（角蛋白）的洗护产品，其分子量（约18kDa）能够有效填充毛鳞片间隙。", emoji: "🔬" },
    ],
    suggestions: ["PH 5.5 弱酸性洗发水更适合细软发质", "吹风机负离子功能可减少毛躁", "每6-8周修剪一次分叉"],
    createdAt: new Date().toISOString(),
    radarScores: { faceShapeMatch: 93, hairTextureMatch: 88, styleVibe: 85, emotionalValue: 72, proKnowledge: 98, humorInteraction: 65 },
  },
};

function transformBackendComment(backend: AIComment, personality: Personality): NonNullable<ReturnType<typeof useAppStore.getState>['aiComment']> {
  // Split comment_text into sections heuristically
  const lines = backend.comment_text.split(/\n+/).filter((l) => l.trim());
  const comments: NonNullable<ReturnType<typeof useAppStore.getState>['aiComment']>['comments'] = [];

  if (lines.length >= 1) {
    comments.push({ category: "overall", title: "造型点评", content: lines[0], emoji: "✨" });
  }
  if (lines.length >= 2) {
    comments.push({ category: "hairstyle", title: "脸型匹配", content: lines[1], emoji: "🎭" });
  }
  if (lines.length >= 3) {
    comments.push({ category: "texture", title: "专业建议", content: lines.slice(2).join("\n"), emoji: "💡" });
  }

  if (comments.length === 0) {
    comments.push({ category: "overall", title: "造型点评", content: backend.comment_text || "AI 造型师给出了精彩点评", emoji: "✨" });
  }

  const base = MOCK_COMMENTS[personality];
  return {
    id: backend.id,
    resultId: backend.image_id,
    overallScore: backend.rating ? Math.min(100, backend.rating * 10) : base.overallScore,
    faceShape: base.faceShape,
    skinTone: base.skinTone,
    comments,
    suggestions: backend.tags && backend.tags.length > 0 ? backend.tags : base.suggestions,
    createdAt: backend.created_at,
    radarScores: base.radarScores,
  };
}

export default function ResultPage() {
  const router = useRouter();
  const {
    generatedImageUrl,
    originalImageUrl,
    selectedStyleName,
    imageId,
    selectedStyleId,
    aiComment,
    personality,
    setAiComment,
    setPersonality,
  } = useAppStore();

  const [loadingComment, setLoadingComment] = useState(false);
  const [activePersonality, setActivePersonality] = useState<Personality>(personality);

  useEffect(() => {
    async function loadComment() {
      if (!imageId || aiComment) return;
      setLoadingComment(true);
      try {
        const body: AICommentRequest = {
          image_id: imageId,
          hairstyle_id: selectedStyleId ?? undefined,
          hairstyle_info: selectedStyleName ?? undefined,
        };
        const res = await api.post<AIComment>("/ai-comment", body);
        setAiComment(transformBackendComment(res, activePersonality));
      } catch {
        setAiComment(MOCK_COMMENTS[activePersonality]);
      } finally {
        setLoadingComment(false);
      }
    }
    loadComment();
  }, [imageId, selectedStyleId, selectedStyleName, aiComment, setAiComment, activePersonality]);

  const handlePersonalityChange = (p: Personality) => {
    setActivePersonality(p);
    setPersonality(p);
    setAiComment(MOCK_COMMENTS[p]);
  };

  const displayComment = aiComment ?? MOCK_COMMENTS[activePersonality];
  const beforeImg = originalImageUrl || generatedImageUrl || "";
  const afterImg = generatedImageUrl || beforeImg;

  if (!generatedImageUrl) {
    return (
      <MobileLayout>
        <div className="flex flex-col items-center justify-center gap-4 py-20 px-4">
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
        <section className="flex flex-col gap-2">
          <h1 className="text-xl font-bold">生成结果</h1>
          <p className="text-muted-foreground text-sm">
            {selectedStyleName ? `AI 为你生成的「${selectedStyleName}」效果图` : "AI 为你生成的发型效果图"}
          </p>
        </section>

        {/* Comparison */}
        <div className="flex flex-col gap-2">
          <ComparisonSlider
            beforeImage={beforeImg}
            afterImage={afterImg}
          />
          <p className="text-muted-foreground text-center text-xs">左右拖动滑块对比效果</p>
        </div>

        {/* Style badge */}
        <div className="flex items-center justify-center gap-2">
          <Badge variant="secondary">{selectedStyleName || "自定义发型"}</Badge>
          <Badge variant="outline" className="text-primary">AI 生成</Badge>
        </div>

        {/* AI Comment Card */}
        <Card>
          <CardContent className="flex flex-col gap-4 p-4">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-primary/10 text-primary text-sm font-bold">AI</AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium">AI 造型师</p>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`h-3 w-3 ${
                          i < Math.round(displayComment.overallScore / 20)
                            ? "fill-primary text-primary"
                            : "text-muted-foreground"
                        }`}
                      />
                    ))}
                    <span className="text-muted-foreground ml-1 text-xs">{displayComment.overallScore}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Personality Switcher */}
            <div className="flex gap-2">
              {PERSONALITIES.map((p) => {
                const Icon = p.icon;
                return (
                  <Button
                    key={p.key}
                    variant={activePersonality === p.key ? "default" : "outline"}
                    size="sm"
                    className="flex-1 gap-1 rounded-full text-xs"
                    onClick={() => handlePersonalityChange(p.key)}
                  >
                    <Icon className={`h-3 w-3 ${p.color}`} />
                    {p.label}
                  </Button>
                );
              })}
            </div>

            {loadingComment ? (
              <Loading message="AI 造型师正在点评..." />
            ) : (
              <>
                {/* Radar Chart */}
                <div className="flex flex-col items-center gap-2">
                  <RadarChart
                    scores={displayComment.radarScores ?? {
                      faceShapeMatch: 90,
                      hairTextureMatch: 85,
                      styleVibe: 88,
                      emotionalValue: 82,
                      proKnowledge: 80,
                      humorInteraction: 75,
                    }}
                    size={220}
                  />
                </div>

                {/* Comments */}
                <div className="space-y-2">
                  {displayComment.comments.map((comment, idx) => (
                    <div key={idx} className="bg-muted rounded-lg p-3">
                      <p className="text-muted-foreground mb-1 flex items-center gap-1 text-xs font-medium">
                        <span>{comment.emoji}</span>
                        {comment.title}
                      </p>
                      <p className="text-sm leading-relaxed">{comment.content}</p>
                    </div>
                  ))}
                </div>

                {/* Suggestions */}
                {displayComment.suggestions.length > 0 && (
                  <div className="bg-primary/5 rounded-lg p-3">
                    <p className="text-primary mb-1 text-xs font-medium">💡 造型建议</p>
                    <ul className="text-muted-foreground list-inside list-disc space-y-1 text-xs">
                      {displayComment.suggestions.map((s, i) => (
                        <li key={i}>{s}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="grid grid-cols-2 gap-3">
          <Button variant="outline" className="h-12 rounded-xl" onClick={() => router.push("/generate")}>
            <RotateCcw className="mr-2 h-5 w-5" />
            换一个发型
          </Button>
          <Button className="h-12 rounded-xl" onClick={() => router.push("/share")}>
            <Share2 className="mr-2 h-5 w-5" />
            分享长图
          </Button>
        </div>

        <Button
          variant="ghost"
          className="h-12 w-full rounded-xl"
          onClick={() => router.push("/upload")}
        >
          <MessageCircle className="mr-2 h-5 w-5" />
          重新上传照片
        </Button>
      </div>
    </MobileLayout>
  );
}
