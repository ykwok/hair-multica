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
import { useAppStore, type Personality, type AICommentData } from "@/lib/store";
import { api } from "@/lib/api/client";
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

const PERSONALITIES: {
  key: Personality;
  label: string;
  icon: React.ElementType;
  color: string;
  backendType: string;
}[] = [
  {
    key: "gentle",
    label: "温柔闺蜜",
    icon: Heart,
    color: "text-rose-500",
    backendType: "warm_bestie",
  },
  {
    key: "sarcastic",
    label: "毒舌造型师",
    icon: Zap,
    color: "text-amber-500",
    backendType: "sassy_stylist",
  },
  {
    key: "knowledge",
    label: "知识型博主",
    icon: BookOpen,
    color: "text-sky-500",
    backendType: "knowledge_blogger",
  },
];

const PERSONALITY_BACKEND_MAP: Record<Personality, string> = {
  gentle: "warm_bestie",
  sarcastic: "sassy_stylist",
  knowledge: "knowledge_blogger",
};

type RadarScores = NonNullable<AICommentData["radarScores"]>;

const SCORE_KEY_MAP: Record<string, keyof RadarScores> = {
  face_match: "faceShapeMatch",
  hair_quality: "hairTextureMatch",
  style: "styleVibe",
  emotion: "emotionalValue",
  knowledge: "proKnowledge",
  humor: "humorInteraction",
};

function mapBackendScores(scores: Record<string, number> | null | undefined): RadarScores {
  const defaultScores: RadarScores = {
    faceShapeMatch: 90,
    hairTextureMatch: 85,
    styleVibe: 88,
    emotionalValue: 82,
    proKnowledge: 80,
    humorInteraction: 75,
  };
  if (!scores) return defaultScores;
  const mapped: Record<string, number> = {};
  for (const [backendKey, frontendKey] of Object.entries(SCORE_KEY_MAP)) {
    const value = scores[backendKey];
    mapped[frontendKey] =
      typeof value === "number"
        ? Math.min(100, Math.round(value * 10))
        : defaultScores[frontendKey];
  }
  return mapped as RadarScores;
}

function transformBackendComment(
  backend: AIComment,
  personality: Personality,
  faceShapeOverride?: string | null
): AICommentData {
  // Split comment_text into sections heuristically
  const lines = backend.comment_text.split(/\n+/).filter((l) => l.trim());
  const comments: AICommentData["comments"] = [];

  if (lines.length >= 1) {
    comments.push({ category: "overall", title: "造型点评", content: lines[0], emoji: "✨" });
  }
  if (lines.length >= 2) {
    comments.push({ category: "hairstyle", title: "脸型匹配", content: lines[1], emoji: "🎭" });
  }
  if (lines.length >= 3) {
    comments.push({
      category: "texture",
      title: "专业建议",
      content: lines.slice(2).join("\n"),
      emoji: "💡",
    });
  }

  if (comments.length === 0) {
    comments.push({
      category: "overall",
      title: "造型点评",
      content: backend.comment_text || "AI 造型师给出了精彩点评",
      emoji: "✨",
    });
  }

  // Add tip as a comment if present
  if (backend.tip) {
    comments.push({ category: "texture", title: "小贴士", content: backend.tip, emoji: "💡" });
  }

  const suggestions =
    backend.highlights && backend.highlights.length > 0
      ? backend.highlights
      : backend.tags && backend.tags.length > 0
        ? backend.tags
        : ["搭配合适的发色会更出彩", "定期修剪保持造型", "使用护发产品保持光泽"];

  return {
    id: backend.id,
    resultId: backend.image_id,
    overallScore: backend.rating ? Math.min(100, Math.round(backend.rating * 10)) : 90,
    faceShape: faceShapeOverride ?? "鹅蛋脸",
    skinTone: "暖白皮",
    comments,
    suggestions,
    createdAt: backend.created_at,
    radarScores: mapBackendScores(backend.scores),
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
    faceAnalysis,
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
          personality_type: PERSONALITY_BACKEND_MAP[activePersonality],
        };
        const res = await api.post<AIComment>("/ai-comment", body);
        setAiComment(transformBackendComment(res, activePersonality, faceAnalysis?.face_shape));
      } catch {
        // Fallback mock comment on error
        setAiComment({
          id: "mock",
          resultId: imageId || "mock",
          overallScore: 88,
          faceShape: faceAnalysis?.face_shape ?? "鹅蛋脸",
          skinTone: "暖白皮",
          comments: [
            {
              category: "overall",
              title: "造型点评",
              content: "这款发型非常适合你，温柔又不失个性！",
              emoji: "✨",
            },
          ],
          suggestions: ["搭配暖棕色会更显白", "定期做发膜护理", "尝试侧分刘海"],
          createdAt: new Date().toISOString(),
          radarScores: {
            faceShapeMatch: 90,
            hairTextureMatch: 85,
            styleVibe: 88,
            emotionalValue: 82,
            proKnowledge: 80,
            humorInteraction: 75,
          },
        });
      } finally {
        setLoadingComment(false);
      }
    }
    loadComment();
  }, [imageId, selectedStyleId, selectedStyleName, aiComment, setAiComment, activePersonality]);

  const handlePersonalityChange = (p: Personality) => {
    setActivePersonality(p);
    setPersonality(p);
    setAiComment(null); // Clear so we re-fetch with new personality
  };

  const displayComment = aiComment ?? {
    id: "mock",
    resultId: "mock",
    overallScore: 88,
    faceShape: faceAnalysis?.face_shape ?? "鹅蛋脸",
    skinTone: "暖白皮",
    comments: [
      {
        category: "overall",
        title: "造型点评",
        content: "这款发型非常适合你，温柔又不失个性！",
        emoji: "✨",
      },
    ],
    suggestions: ["搭配暖棕色会更显白", "定期做发膜护理", "尝试侧分刘海"],
    createdAt: new Date().toISOString(),
    radarScores: {
      faceShapeMatch: 90,
      hairTextureMatch: 85,
      styleVibe: 88,
      emotionalValue: 82,
      proKnowledge: 80,
      humorInteraction: 75,
    },
  };

  const beforeImg = originalImageUrl || generatedImageUrl || "";
  const afterImg = generatedImageUrl || beforeImg;

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
        <section className="flex flex-col gap-2">
          <h1 className="text-xl font-bold">生成结果</h1>
          <p className="text-muted-foreground text-sm">
            {selectedStyleName
              ? `AI 为你生成的「${selectedStyleName}」效果图`
              : "AI 为你生成的发型效果图"}
          </p>
        </section>

        {/* Comparison */}
        <div className="flex flex-col gap-2">
          <ComparisonSlider beforeImage={beforeImg} afterImage={afterImg} />
          <p className="text-muted-foreground text-center text-xs">左右拖动滑块对比效果</p>
        </div>

        {/* Style badge */}
        <div className="flex items-center justify-center gap-2">
          <Badge variant="secondary">{selectedStyleName || "自定义发型"}</Badge>
          <Badge variant="outline" className="text-primary">
            AI 生成
          </Badge>
        </div>

        {/* AI Comment Card */}
        <Card>
          <CardContent className="flex flex-col gap-4 p-4">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-primary/10 text-primary text-sm font-bold">
                    AI
                  </AvatarFallback>
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
                    <span className="text-muted-foreground ml-1 text-xs">
                      {displayComment.overallScore}
                    </span>
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
                    scores={
                      displayComment.radarScores ?? {
                        faceShapeMatch: 90,
                        hairTextureMatch: 85,
                        styleVibe: 88,
                        emotionalValue: 82,
                        proKnowledge: 80,
                        humorInteraction: 75,
                      }
                    }
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
          <Button
            variant="outline"
            className="h-12 rounded-xl"
            onClick={() => router.push("/generate")}
          >
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
