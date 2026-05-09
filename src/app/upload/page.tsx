"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { MobileLayout } from "@/components/layout/mobile-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Camera, Image as ImageIcon, ArrowRight, RotateCcw, Check, Crop, X } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { api } from "@/lib/api/client";
import { toast } from "sonner";
import Cropper from "react-easy-crop";
import type { Area } from "react-easy-crop";
import { Loading } from "@/components/ui/loading";
import type { UploadResponse, FaceAnalysisResponse } from "@/lib/api/types";

type Step = "select" | "preview" | "crop" | "uploading";

function readFile(file: File): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(reader.result as string));
    reader.readAsDataURL(file);
  });
}

async function getCroppedImg(imageSrc: string, pixelCrop: Area): Promise<string> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement("canvas");
  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  );
  return canvas.toDataURL("image/jpeg", 0.92);
}

function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", (error) => reject(error));
    image.src = url;
  });
}

export default function UploadPage() {
  const router = useRouter();
  const { setUploadedImage, setCroppedImage, setUploadedImageUrl, setImageId, setFaceAnalysis } =
    useAppStore();

  const [step, setStep] = useState<Step>("select");
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [progress, setProgress] = useState(0);
  const [aspect, setAspect] = useState(3 / 4);

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const onFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      if (!file.type.startsWith("image/")) {
        toast.error("请上传图片文件");
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast.error("图片大小不能超过 10MB");
        return;
      }
      const dataUrl = await readFile(file);
      setImageSrc(dataUrl);
      setUploadedImage(dataUrl);
      setStep("preview");
    },
    [setUploadedImage]
  );

  const handleCrop = useCallback(async () => {
    if (!imageSrc || !croppedAreaPixels) return;
    try {
      const cropped = await getCroppedImg(imageSrc, croppedAreaPixels);
      setCroppedImage(cropped);
      setStep("uploading");

      // Simulate progress
      let p = 0;
      const interval = setInterval(() => {
        p += Math.random() * 15;
        if (p >= 90) {
          p = 90;
          clearInterval(interval);
        }
        setProgress(Math.min(p, 90));
      }, 300);

      // Upload
      const blob = await (await fetch(cropped)).blob();
      const formData = new FormData();
      formData.append("file", blob, "upload.jpg");

      try {
        const res = await api.post<UploadResponse>("/upload", formData);
        setUploadedImageUrl(res.url);
        setImageId(res.image_id);

        // Trigger face analysis in background
        try {
          const faceRes = await api.post<FaceAnalysisResponse>("/analyze-face", {
            image_id: res.image_id,
          });
          setFaceAnalysis({
            face_shape: faceRes.face_shape,
            forehead_width: faceRes.forehead_width,
            cheekbone_width: faceRes.cheekbone_width,
            jawline_width: faceRes.jawline_width,
            face_length: faceRes.face_length,
            features: faceRes.features,
          });
        } catch {
          // Face analysis failure is non-blocking
        }

        setProgress(100);
        clearInterval(interval);
        toast.success("上传成功！");
        setTimeout(() => router.push("/generate"), 600);
      } catch (err) {
        clearInterval(interval);
        // Fallback: use cropped image as local URL for demo
        setUploadedImageUrl(cropped);
        setImageId("local-" + Date.now());
        setProgress(100);
        toast.success("上传成功（本地模式）");
        setTimeout(() => router.push("/generate"), 600);
      }
    } catch {
      toast.error("裁剪失败，请重试");
    }
  }, [imageSrc, croppedAreaPixels, setCroppedImage, setUploadedImageUrl, setImageId, router]);

  const reset = useCallback(() => {
    setStep("select");
    setImageSrc(null);
    setCroppedImage(null);
    setUploadedImage(null);
    setUploadedImageUrl(null);
    setImageId(null);
    setProgress(0);
    setZoom(1);
    setCrop({ x: 0, y: 0 });
    if (cameraInputRef.current) cameraInputRef.current.value = "";
    if (galleryInputRef.current) galleryInputRef.current.value = "";
  }, [setCroppedImage, setUploadedImage, setUploadedImageUrl, setImageId]);

  return (
    <MobileLayout>
      <div className="flex flex-col gap-5 p-4">
        <section className="flex flex-col gap-2">
          <h1 className="text-xl font-bold">上传照片</h1>
          <p className="text-muted-foreground text-sm">
            {step === "select" && "选择一张清晰的正面照，AI 将为你换发型"}
            {step === "preview" && "预览照片，确认后进入裁剪"}
            {step === "crop" && "调整裁剪区域，让面部居中"}
            {step === "uploading" && "正在上传照片..."}
          </p>
        </section>

        {step === "select" && (
          <>
            <Card
              className="cursor-pointer transition-all hover:shadow-md"
              onClick={() => cameraInputRef.current?.click()}
            >
              <CardContent className="flex flex-col items-center justify-center gap-4 py-12">
                <div className="bg-primary/10 text-primary flex h-16 w-16 items-center justify-center rounded-full">
                  <Camera className="h-8 w-8" />
                </div>
                <div className="text-center">
                  <p className="font-medium">相机拍照</p>
                  <p className="text-muted-foreground mt-1 text-xs">点击唤起相机</p>
                </div>
              </CardContent>
            </Card>

            <div className="text-muted-foreground flex items-center gap-2 text-xs">
              <div className="bg-border h-px flex-1" />
              <span>或</span>
              <div className="bg-border h-px flex-1" />
            </div>

            <Button
              variant="outline"
              className="h-12 w-full rounded-xl"
              onClick={() => galleryInputRef.current?.click()}
            >
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
          </>
        )}

        {(step === "preview" || step === "crop") && imageSrc && (
          <>
            <div className="relative overflow-hidden rounded-xl border">
              {step === "crop" ? (
                <div className="relative h-[320px] w-full">
                  <Cropper
                    image={imageSrc}
                    crop={crop}
                    zoom={zoom}
                    aspect={aspect}
                    onCropChange={setCrop}
                    onZoomChange={setZoom}
                    onCropComplete={(_, areaPixels) => setCroppedAreaPixels(areaPixels)}
                    showGrid={false}
                  />
                  {/* Face guide overlay */}
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                    <div className="border-primary/40 h-48 w-36 rounded-full border-2 border-dashed" />
                  </div>
                </div>
              ) : (
                <div className="relative">
                  <img src={imageSrc} alt="Preview" className="h-auto w-full object-contain" />
                  {/* Face guide overlay */}
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                    <div className="border-primary/40 h-48 w-36 rounded-full border-2 border-dashed" />
                  </div>
                </div>
              )}
            </div>

            {step === "crop" && (
              <div className="flex items-center gap-3">
                <span className="text-muted-foreground text-xs">比例:</span>
                <div className="flex gap-2">
                  <Button
                    variant={aspect === 1 ? "default" : "outline"}
                    size="sm"
                    className="h-8 rounded-lg text-xs"
                    onClick={() => setAspect(1)}
                  >
                    1:1
                  </Button>
                  <Button
                    variant={aspect === 3 / 4 ? "default" : "outline"}
                    size="sm"
                    className="h-8 rounded-lg text-xs"
                    onClick={() => setAspect(3 / 4)}
                  >
                    3:4
                  </Button>
                </div>
              </div>
            )}

            <div className="flex gap-3">
              {step === "preview" ? (
                <>
                  <Button variant="outline" className="h-12 flex-1 rounded-xl" onClick={reset}>
                    <X className="mr-2 h-5 w-5" />
                    重新选择
                  </Button>
                  <Button className="h-12 flex-1 rounded-xl" onClick={() => setStep("crop")}>
                    <Crop className="mr-2 h-5 w-5" />
                    裁剪照片
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant="outline"
                    className="h-12 flex-1 rounded-xl"
                    onClick={() => setStep("preview")}
                  >
                    <RotateCcw className="mr-2 h-5 w-5" />
                    返回
                  </Button>
                  <Button className="h-12 flex-1 rounded-xl" onClick={handleCrop}>
                    <Check className="mr-2 h-5 w-5" />
                    确认裁剪
                  </Button>
                </>
              )}
            </div>
          </>
        )}

        {step === "uploading" && (
          <div className="flex flex-col items-center gap-6 py-12">
            <Loading message="正在上传照片..." />
            <div className="w-full max-w-xs">
              <div className="bg-muted h-2 w-full overflow-hidden rounded-full">
                <div
                  className="bg-primary h-full rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-muted-foreground mt-2 text-center text-xs">
                {Math.round(progress)}%
              </p>
            </div>
          </div>
        )}

        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="user"
          className="hidden"
          onChange={onFileChange}
        />
        <input
          ref={galleryInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={onFileChange}
        />
      </div>
    </MobileLayout>
  );
}
