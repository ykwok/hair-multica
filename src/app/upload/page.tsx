"use client";

import { MobileLayout } from "@/components/layout/mobile-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Camera, Image as ImageIcon, ArrowRight } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function UploadPage() {
  const router = useRouter();
  const [selected, setSelected] = useState(false);

  const handleUpload = () => {
    setSelected(true);
    setTimeout(() => {
      router.push("/generate");
    }, 800);
  };

  return (
    <MobileLayout>
      <div className="flex flex-col gap-6 p-4">
        <section className="flex flex-col gap-2">
          <h1 className="text-xl font-bold">上传照片</h1>
          <p className="text-muted-foreground text-sm">选择一张清晰的正面照，AI 将为你换发型</p>
        </section>

        <Card
          className={`cursor-pointer transition-all ${selected ? "border-primary ring-primary/20 ring-2" : "hover:shadow-md"}`}
          onClick={handleUpload}
        >
          <CardContent className="flex flex-col items-center justify-center gap-4 py-12">
            <div className="bg-primary/10 text-primary flex h-16 w-16 items-center justify-center rounded-full">
              <Camera className="h-8 w-8" />
            </div>
            <div className="text-center">
              <p className="font-medium">点击上传照片</p>
              <p className="text-muted-foreground mt-1 text-xs">支持 JPG、PNG 格式，最大 10MB</p>
            </div>
          </CardContent>
        </Card>

        <div className="text-muted-foreground flex items-center gap-2 text-xs">
          <div className="bg-border h-px flex-1" />
          <span>或从相册选择</span>
          <div className="bg-border h-px flex-1" />
        </div>

        <Button variant="outline" className="h-12 w-full rounded-xl" onClick={handleUpload}>
          <ImageIcon className="mr-2 h-5 w-5" />
          从相册选择
        </Button>

        <div className="bg-muted mt-4 rounded-xl p-4">
          <h3 className="mb-2 text-sm font-medium">上传小贴士</h3>
          <ul className="text-muted-foreground list-inside list-disc space-y-1.5 text-xs">
            <li>请使用正面清晰照片</li>
            <li>确保光线充足，面部无遮挡</li>
            <li>避免戴帽子或墨镜</li>
          </ul>
        </div>

        {selected && (
          <Button className="h-12 w-full rounded-xl" disabled>
            <ArrowRight className="mr-2 h-5 w-5 animate-pulse" />
            正在处理...
          </Button>
        )}
      </div>
    </MobileLayout>
  );
}
