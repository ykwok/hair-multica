"use client";

import { MobileLayout } from "@/components/layout/mobile-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Wand2, MessageCircle, ChevronRight, Flame, Star, TrendingUp, Users } from "lucide-react";
import Link from "next/link";
import { useAppStore } from "@/lib/store";

const HOT_STYLES = [
  { id: "1", name: "清爽短发", tag: "热门", color: "bg-rose-100 text-rose-600" },
  { id: "2", name: "波浪卷发", tag: "推荐", color: "bg-amber-100 text-amber-600" },
  { id: "3", name: "中长发", tag: "", color: "bg-emerald-100 text-emerald-600" },
  { id: "4", name: "法式刘海", tag: "新品", color: "bg-sky-100 text-sky-600" },
  { id: "5", name: "一刀切", tag: "热门", color: "bg-violet-100 text-violet-600" },
  { id: "6", name: "Lisa 同款", tag: "明星", color: "bg-pink-100 text-pink-600" },
];

const USER_WORKS = [
  { id: "u1", name: "小红薯_9527", style: "波浪卷发", likes: 328 },
  { id: "u2", name: "发型探索者", style: "锁骨发", likes: 256 },
  { id: "u3", name: "爱美小姐姐", style: "法式刘海", likes: 189 },
];

export default function HomePage() {
  const { dailyFreeCount } = useAppStore();

  return (
    <MobileLayout>
      <div className="flex flex-col gap-6 p-4">
        {/* Hero */}
        <section className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <div className="bg-primary/10 flex h-10 w-10 items-center justify-center rounded-xl">
              <Sparkles className="text-primary h-6 w-6" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">发型宇宙</h1>
          </div>
          <p className="text-muted-foreground text-sm leading-relaxed">
            看看其他发型的我，让 AI 造型师为你点评
            <br />
            发现属于你的完美发型
          </p>
          {/* Free count chip */}
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="gap-1 rounded-full px-2.5 py-1">
              <Flame className="h-3 w-3 text-orange-500" />
              今日免费 {dailyFreeCount} 次
            </Badge>
            <Badge variant="outline" className="rounded-full px-2.5 py-1 text-xs">
              分享解锁更多
            </Badge>
          </div>
        </section>

        {/* Core Features */}
        <section className="grid grid-cols-1 gap-3">
          <Link href="/upload">
            <Card className="cursor-pointer transition-shadow hover:shadow-md">
              <CardContent className="flex items-center gap-4 p-4">
                <div className="bg-primary/10 text-primary flex h-14 w-14 items-center justify-center rounded-xl">
                  <Wand2 className="h-7 w-7" />
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-semibold">看看其他发型的我</h3>
                  <p className="text-muted-foreground mt-0.5 text-xs">上传照片，AI 一键换发型</p>
                </div>
                <ChevronRight className="text-muted-foreground h-5 w-5" />
              </CardContent>
            </Card>
          </Link>

          <Link href="/upload">
            <Card className="cursor-pointer transition-shadow hover:shadow-md">
              <CardContent className="flex items-center gap-4 p-4">
                <div className="bg-secondary text-secondary-foreground flex h-14 w-14 items-center justify-center rounded-xl">
                  <MessageCircle className="h-7 w-7" />
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-semibold">AI 造型师点评</h3>
                  <p className="text-muted-foreground mt-0.5 text-xs">高情商点评你的造型</p>
                </div>
                <ChevronRight className="text-muted-foreground h-5 w-5" />
              </CardContent>
            </Card>
          </Link>
        </section>

        {/* Hot Styles */}
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <TrendingUp className="text-primary h-4 w-4" />
              <h2 className="text-base font-semibold">热门发型</h2>
            </div>
            <Link href="/generate" className="text-primary text-xs">
              查看更多
            </Link>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide">
            {HOT_STYLES.map((style) => (
              <Link key={style.id} href="/generate" className="shrink-0">
                <Card className="w-24 cursor-pointer transition-shadow hover:shadow-md">
                  <CardContent className="flex flex-col items-center gap-2 p-3">
                    <div className={`flex h-12 w-12 items-center justify-center rounded-full text-sm font-bold ${style.color}`}>
                      {style.name.slice(0, 1)}
                    </div>
                    <span className="text-xs font-medium">{style.name}</span>
                    {style.tag && (
                      <Badge variant="secondary" className="px-1 py-0 text-[10px]">
                        {style.tag}
                      </Badge>
                    )}
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>

        {/* User Works */}
        <section className="flex flex-col gap-3">
          <div className="flex items-center gap-1.5">
            <Users className="text-primary h-4 w-4" />
            <h2 className="text-base font-semibold">用户作品</h2>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {USER_WORKS.map((work) => (
              <Card key={work.id} className="overflow-hidden">
                <CardContent className="flex flex-col items-center gap-2 p-3">
                  <div className="bg-muted flex h-16 w-16 items-center justify-center rounded-xl">
                    <Sparkles className="text-muted-foreground h-6 w-6" />
                  </div>
                  <div className="flex flex-col items-center gap-0.5">
                    <span className="text-xs font-medium">{work.name}</span>
                    <span className="text-muted-foreground text-[10px]">{work.style}</span>
                    <div className="flex items-center gap-0.5">
                      <Star className="fill-amber-400 text-amber-400 h-3 w-3" />
                      <span className="text-[10px] text-gray-500">{work.likes}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="mt-2">
          <Link href="/upload">
            <Button className="h-12 w-full rounded-xl text-base" size="lg">
              <Sparkles className="mr-2 h-5 w-5" />
              立即体验
            </Button>
          </Link>
        </section>
      </div>
    </MobileLayout>
  );
}
