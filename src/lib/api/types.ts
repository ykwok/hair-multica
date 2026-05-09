export interface HairStyle {
  id: string;
  name: string;
  category: "short" | "medium" | "long" | "curly" | "straight" | "bangs" | "celebrity";
  thumbnailUrl: string;
  popularity: number;
  faceShapes?: string[];
  tags?: string[];
}

export interface GenerateRequest {
  imageUrl: string;
  targetStyleId?: string;
  customDescription?: string;
  options?: {
    preserveColor?: boolean;
    intensity?: "light" | "medium" | "strong";
  };
}

export interface GenerateResult {
  id: string;
  originalImageUrl: string;
  generatedImageUrl: string;
  style?: HairStyle;
  status: "pending" | "processing" | "completed" | "failed";
  createdAt: string;
  completedAt?: string;
}

export interface AIComment {
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

export interface UploadResponse {
  url: string;
  key: string;
}

export interface UserProfile {
  id: string;
  nickname: string;
  avatarUrl?: string;
  createdAt: string;
  totalGenerations: number;
  totalShares: number;
}

export interface PaginationParams {
  page?: number;
  pageSize?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}
