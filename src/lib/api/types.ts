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

export interface GenerateTaskResponse {
  task_id: string;
  status: string;
}

export interface TaskStatus {
  task_id: string;
  task_type: string;
  status: string; // pending, running, success, failed
  result?: GenerateResult | null;
  result_url?: string | null;
  error_message?: string | null;
  created_at: string;
  updated_at: string;
}

export interface AIComment {
  id: string;
  image_id: string;
  hairstyle_id?: string | null;
  comment_text: string;
  personality?: string | null;
  scores?: Record<string, number> | null;
  rating?: number | null;
  highlights?: string[] | null;
  tip?: string | null;
  tags?: string[] | null;
  created_at: string;
}

export interface AICommentRequest {
  image_id: string;
  hairstyle_id?: string | null;
  hairstyle_info?: string | null;
  personality_type?: string; // warm_bestie | sassy_stylist | knowledge_blogger
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

export interface FaceAnalysisResponse {
  id: string;
  image_id: string;
  face_shape?: string | null;
  forehead_width?: number | null;
  cheekbone_width?: number | null;
  jawline_width?: number | null;
  face_length?: number | null;
  features?: Record<string, unknown> | null;
}

export interface PaginationParams {
  page?: number;
  per_page?: number;
}
