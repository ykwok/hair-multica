export interface HairStyle {
  id: string;
  name: string;
  category: string;
  style?: string | null;
  description?: string | null;
  cover_image_url?: string | null;
  tags: string[];
  sort_order?: number;
  created_at?: string;
  updated_at?: string;
}

export interface HairstyleListResponse {
  items: HairStyle[];
  total: number;
}

export interface GenerateRequest {
  image_id: string;
  hairstyle_id?: string | null;
  custom_prompt?: string | null;
}

export interface GenerateResult {
  id: string;
  image_id: string;
  hairstyle_id?: string | null;
  custom_prompt?: string | null;
  result_image_url: string;
  status: string;
  created_at: string;
}

export interface AIComment {
  id: string;
  image_id: string;
  hairstyle_id?: string | null;
  comment_text: string;
  rating?: number | null;
  tags?: string[] | null;
  created_at: string;
}

export interface AICommentRequest {
  image_id: string;
  hairstyle_id?: string | null;
  hairstyle_info?: string | null;
}

export interface UploadResponse {
  image_id: string;
  url: string;
}

export interface UserProfile {
  id: string;
  openid: string;
  nickname?: string | null;
  avatar_url?: string | null;
  created_at: string;
  updated_at: string;
}

export interface PaginationParams {
  page?: number;
  per_page?: number;
}
