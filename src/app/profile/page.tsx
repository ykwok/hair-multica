"use client";

import { MobileLayout } from "@/components/layout/mobile-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Sparkles, Image as ImageIcon, Share2, Settings } from "lucide-react";

export default function ProfilePage() {
  return (
    <MobileLayout>
      <div className="flex flex-col gap-5 p-4">
        {/* User header */}
        <section className="flex items-center gap-4">
          <Avatar className="h-16 w-16">
            <AvatarImage src="" alt="用户头像" />
            <AvatarFallback className="bg-primary/10 text-primary text-lg">发</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold">发型探索者</h1>
              <Badge variant="secondary" className="text-[10px]">
                VIP
              </Badge>
            </div>
            <p className="text-muted-foreground text-xs">ID: hair_2026_001</p>
          </div>
          <Settings className="text-muted-foreground h-5 w-5" />
        </section>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <Card>
            <CardContent className="flex flex-col items-center py-3">
              <span className="text-lg font-bold">12</span>
              <span className="text-muted-foreground text-xs">生成次数</span>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex flex-col items-center py-3">
              <span className="text-lg font-bold">8</span>
              <span className="text-muted-foreground text-xs">收藏发型</span>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex flex-col items-center py-3">
              <span className="text-lg font-bold">3</span>
              <span className="text-muted-foreground text-xs">分享次数</span>
            </CardContent>
          </Card>
        </div>

        {/* History */}
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-medium">生成记录</h2>
          <div className="flex flex-col gap-3">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardContent className="flex items-center gap-3 p-3">
                  <div className="bg-muted flex h-14 w-14 items-center justify-center rounded-lg">
                    <Sparkles className="text-muted-foreground h-6 w-6" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">波浪卷发</p>
                    <p className="text-muted-foreground text-xs">2026-05-09</p>
                  </div>
                  <div className="flex gap-1">
                    <ImageIcon className="text-muted-foreground h-4 w-4" />
                    <Share2 className="text-muted-foreground h-4 w-4" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Skeleton loading example */}
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-medium">更多功能</h2>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-lg" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-32" />
                </div>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </MobileLayout>
  );
}
