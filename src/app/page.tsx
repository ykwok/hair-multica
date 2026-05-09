import { MobileLayout } from "@/components/layout/mobile-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Sparkles, Wand2, MessageCircle, ChevronRight } from "lucide-react";
import Link from "next/link";

export default function HomePage() {
  return (
    <MobileLayout>
      <div className="flex flex-col gap-6 p-4">
        {/* Hero */}
        <section className="flex flex-col gap-3">
          <h1 className="text-2xl font-bold tracking-tight">发型宇宙</h1>
          <p className="text-muted-foreground text-sm">AI 驱动，发现属于你的完美发型</p>
        </section>

        {/* Core Features */}
        <section className="grid grid-cols-1 gap-3">
          <Link href="/upload">
            <Card className="cursor-pointer transition-shadow hover:shadow-md">
              <CardContent className="flex items-center gap-4 p-4">
                <div className="bg-primary/10 text-primary flex h-12 w-12 items-center justify-center rounded-xl">
                  <Wand2 className="h-6 w-6" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold">看看其他发型的我</h3>
                  <p className="text-muted-foreground text-xs">上传照片，AI 换发型</p>
                </div>
                <ChevronRight className="text-muted-foreground h-5 w-5" />
              </CardContent>
            </Card>
          </Link>

          <Link href="/upload">
            <Card className="cursor-pointer transition-shadow hover:shadow-md">
              <CardContent className="flex items-center gap-4 p-4">
                <div className="bg-secondary text-secondary-foreground flex h-12 w-12 items-center justify-center rounded-xl">
                  <MessageCircle className="h-6 w-6" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold">AI 造型师点评</h3>
                  <p className="text-muted-foreground text-xs">高情商点评你的造型</p>
                </div>
                <ChevronRight className="text-muted-foreground h-5 w-5" />
              </CardContent>
            </Card>
          </Link>
        </section>

        {/* Trending Styles */}
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">热门发型</h2>
            <Link href="/generate" className="text-primary text-xs">
              查看更多
            </Link>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {["短发", "波浪卷", "中长发"].map((style) => (
              <div
                key={style}
                className="bg-card flex flex-col items-center gap-2 rounded-xl border p-3"
              >
                <div className="bg-muted flex h-14 w-14 items-center justify-center rounded-full">
                  <Sparkles className="text-muted-foreground h-6 w-6" />
                </div>
                <span className="text-xs font-medium">{style}</span>
              </div>
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
