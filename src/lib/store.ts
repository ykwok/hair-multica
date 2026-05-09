import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Personality = "gentle" | "sarcastic" | "knowledge";

export interface FaceAnalysisData {
  face_shape?: string | null;
  forehead_width?: number | null;
  cheekbone_width?: number | null;
  jawline_width?: number | null;
  face_length?: number | null;
  features?: Record<string, unknown> | null;
}

export interface AppState {
  // Upload
  uploadedImage: string | null;
  croppedImage: string | null;
  uploadedImageUrl: string | null;
  imageId: string | null;

  // Face Analysis
  faceAnalysis: FaceAnalysisData | null;

  // Generation
  selectedStyleId: string | null;
  selectedStyleName: string | null;
  customDescription: string | null;
  generateResultId: string | null;
  generatedImageUrl: string | null;
  originalImageUrl: string | null;

  // AI Comment
  aiComment: AICommentData | null;
  personality: Personality;

  // User
  dailyFreeCount: number;

  // Actions
  setUploadedImage: (url: string | null) => void;
  setCroppedImage: (url: string | null) => void;
  setUploadedImageUrl: (url: string | null) => void;
  setImageId: (id: string | null) => void;
  setFaceAnalysis: (data: FaceAnalysisData | null) => void;
  setSelectedStyle: (id: string | null, name?: string | null) => void;
  setCustomDescription: (desc: string | null) => void;
  setGenerateResult: (
    resultId: string | null,
    originalUrl: string | null,
    generatedUrl: string | null
  ) => void;
  setAiComment: (comment: AICommentData | null) => void;
  setPersonality: (p: Personality) => void;
  decrementFreeCount: () => void;
  resetFlow: () => void;
}

export interface AICommentData {
  id: string;
  resultId: string;
  overallScore: number;
  faceShape: string;
  skinTone: string;
  comments: {
    category: "hairstyle" | "color" | "texture" | "overall";
    title: string;
    content: string;
    emoji: string;
  }[];
  suggestions: string[];
  createdAt: string;
  radarScores?: {
    faceShapeMatch: number;
    hairTextureMatch: number;
    styleVibe: number;
    emotionalValue: number;
    proKnowledge: number;
    humorInteraction: number;
  };
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      uploadedImage: null,
      croppedImage: null,
      uploadedImageUrl: null,
      imageId: null,
      faceAnalysis: null,
      selectedStyleId: null,
      selectedStyleName: null,
      customDescription: null,
      generateResultId: null,
      generatedImageUrl: null,
      originalImageUrl: null,
      aiComment: null,
      personality: "gentle",
      dailyFreeCount: 3,

      setUploadedImage: (url) => set({ uploadedImage: url }),
      setCroppedImage: (url) => set({ croppedImage: url }),
      setUploadedImageUrl: (url) => set({ uploadedImageUrl: url }),
      setImageId: (id) => set({ imageId: id }),
      setFaceAnalysis: (data) => set({ faceAnalysis: data }),
      setSelectedStyle: (id, name) => set({ selectedStyleId: id, selectedStyleName: name ?? null }),
      setCustomDescription: (desc) => set({ customDescription: desc }),
      setGenerateResult: (resultId, originalUrl, generatedUrl) =>
        set({
          generateResultId: resultId,
          originalImageUrl: originalUrl,
          generatedImageUrl: generatedUrl,
        }),
      setAiComment: (comment) => set({ aiComment: comment }),
      setPersonality: (p) => set({ personality: p }),
      decrementFreeCount: () =>
        set((state) => ({ dailyFreeCount: Math.max(0, state.dailyFreeCount - 1) })),
      resetFlow: () =>
        set({
          uploadedImage: null,
          croppedImage: null,
          uploadedImageUrl: null,
          imageId: null,
          faceAnalysis: null,
          selectedStyleId: null,
          selectedStyleName: null,
          customDescription: null,
          generateResultId: null,
          generatedImageUrl: null,
          originalImageUrl: null,
          aiComment: null,
        }),
    }),
    {
      name: "hair-app-storage",
      partialize: (state) => ({
        dailyFreeCount: state.dailyFreeCount,
        personality: state.personality,
      }),
    }
  )
);
