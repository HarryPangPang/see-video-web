const API_HOST = _GLOBAL_VARS_.VITE_API_HOST;
const API_BASE_URL = `${API_HOST}/api`;
// 创建生成任务的请求数据接口
export interface CreateGenerationRequest {
  creationType: 'agent' | 'image' | 'video';
  model: 'seedance20' | 'seedance20fast' | '35pro' | '30pro' | '30fast' | '30';
  frameMode: 'omni' | 'startEnd' | 'multi' | 'subject';
  ratio: '21:9' | '16:9' | '4:3' | '1:1' | '3:4' | '9:16';
  duration: string;
  prompt: string;
  startFrame?: string; // base64 或 URL
  endFrame?: string; // base64 或 URL
  omniFrames?: string[]; // 全能参考模式：1-5张图片的 base64 或 URL 数组
}

// API 响应接口
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

// 上传图片到服务器（如果需要先上传图片）
export async function uploadImage(file: File): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_BASE_URL}/upload`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error('Image upload failed');
  }

  const result: ApiResponse<{ url: string }> = await response.json();

  if (!result.success || !result.data?.url) {
    throw new Error(result.message || 'Image upload failed');
  }

  return result.data.url;
}

// 将图片转换为 base64
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Failed to convert file to base64'));
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// 提交生成任务（会转发到 see-video-server -> see-video-chrome，并打开即梦页面）
export async function createGeneration(
  data: CreateGenerationRequest
): Promise<ApiResponse<{ projectId: string }>> {
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('auth_token') : null;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const response = await fetch(`${API_BASE_URL}/generate`, {
    method: 'POST',
    headers,
    body: JSON.stringify(data),
  });

  // 先读取 JSON 响应体
  const result: ApiResponse = await response.json();

  // 调试日志
  console.log('[API] Generate response:', { status: response.status, ok: response.ok, result });

  // 检查业务层面的错误（包括 400 等客户端错误）
  if (!response.ok || !result.success) {
    // 优先使用响应体中的详细错误信息
    const errorMessage = result.message || result.error || result?.data?.message || result?.data?.error || `Request failed: ${response.status} ${response.statusText}`;
    console.log('[API] Error message extracted:', errorMessage);
    throw new Error(errorMessage);
  }

  return result;
}
// ========== 积分和支付相关 API ==========

// 获取当前积分余额
export async function getCreditsBalance(): Promise<ApiResponse<{ credits: number }>> {
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('auth_token') : null;
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const response = await fetch(`${API_BASE_URL}/credits/balance`, {
    method: 'GET',
    headers,
  });

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }

  const result: ApiResponse = await response.json();
  if (!result.success) {
    throw new Error(result.message || 'Failed to get credits');
  }

  return result;
}

// 创建支付订单
export async function createPayment(amount: number, credits: number): Promise<ApiResponse<{ orderId: string; checkoutUrl: string }>> {
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('auth_token') : null;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const response = await fetch(`${API_BASE_URL}/payment/create`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ amount, credits }),
  });

  if (!response.ok) {
    throw new Error(`请求失败: ${response.status}`);
  }

  const result: ApiResponse = await response.json();
  if (!result.success) {
    throw new Error(result.message || 'Failed to create payment order');
  }

  return result;
}

// 获取所有视频列表

export async function getList(taskId: string): Promise<ApiResponse> {
  const response = await fetch(`${API_BASE_URL}/list`, {
    method: 'GET',
  });
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status} ${response.statusText}`);
  }

  const result: ApiResponse = await response.json();

  return result;
}

export async function deleteVideoGeneration(id: string): Promise<ApiResponse<void>> {
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('auth_token') : null;
  if (!token) throw new Error('Unauthorized');
  const response = await fetch(`${API_BASE_URL}/video-generations/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  const result = await response.json();
  if (!response.ok || !result.success) throw new Error(result.message || 'Delete failed');
  return result;
}

// 获取即梦视频列表（支持 AbortSignal 避免重复请求）
export async function getVideoList(signal?: AbortSignal): Promise<ApiResponse> {
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('auth_token') : null;
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const response = await fetch(`${API_BASE_URL}/video-list`, {
    method: 'GET',
    headers,
    signal,
  });

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status} ${response.statusText}`);
  }

  const result: ApiResponse = await response.json();

  return result;
}

// ========== 作品广场、发布、点赞、评论 ==========

export interface WorkItem {
  id: string;
  user_id: number;
  author: string;
  author_email?: string;
  title: string;
  prompt: string | null;
  video_url: string;
  cover_url: string | null;
  source: string;
  created_at: number;
  like_count?: number;
  is_private?: number;
}

export interface WorkDetail extends WorkItem {
  liked: boolean;
  comments: { id: number; content: string; created_at: number; author: string }[];
}

export interface WorksListParams {
  sort?: 'newest' | 'likes' | 'foryou';
  page?: number;
  limit?: number;
  mine?: boolean;
  source?: 'jimeng' | 'upload';
}

export interface WorksListData {
  list: WorkItem[];
  total: number;
  hasMore: boolean;
}

export async function getWorksList(params?: WorksListParams): Promise<ApiResponse<WorksListData>> {
  const qs = new URLSearchParams();
  if (params?.sort) qs.set('sort', params.sort);
  if (params?.page) qs.set('page', String(params.page));
  if (params?.limit) qs.set('limit', String(params.limit));
  if (params?.mine) qs.set('mine', 'true');
  if (params?.source) qs.set('source', params.source);
  const query = qs.toString() ? `?${qs}` : '';
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('auth_token') : null;
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const response = await fetch(`${API_BASE_URL}/works${query}`, { headers });
  if (!response.ok) throw new Error(`Request failed: ${response.status}`);
  const result: ApiResponse<WorksListData> = await response.json();
  if (!result.success) throw new Error(result.message || 'Failed to fetch works');
  return result;
}

export async function deleteWork(id: string): Promise<ApiResponse<void>> {
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('auth_token') : null;
  if (!token) throw new Error('Unauthorized');
  const response = await fetch(`${API_BASE_URL}/works/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  const result = await response.json();
  if (!response.ok || !result.success) throw new Error(result.message || 'Delete failed');
  return result;
}

export async function updateWorkPrivacy(id: string, isPrivate: boolean): Promise<ApiResponse<void>> {
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('auth_token') : null;
  if (!token) throw new Error('Unauthorized');
  const response = await fetch(`${API_BASE_URL}/works/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ isPrivate }),
  });
  const result = await response.json();
  if (!response.ok || !result.success) throw new Error(result.message || 'Update failed');
  return result;
}

export async function getWorkDetail(id: string): Promise<ApiResponse<WorkDetail>> {
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('auth_token') : null;
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const response = await fetch(`${API_BASE_URL}/works/${id}`, { headers });
  if (!response.ok) throw new Error(`Request failed: ${response.status}`);
  const result: ApiResponse<WorkDetail> = await response.json();
  if (!result.success) throw new Error(result.message || 'Failed to fetch work');
  return result;
}

export async function publishWork(videoGenerationId: string, title: string): Promise<ApiResponse<{ id: string }>> {
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('auth_token') : null;
  if (!token) throw new Error('Unauthorized');
  const response = await fetch(`${API_BASE_URL}/works`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ videoGenerationId, title }),
  });
  const result: ApiResponse<{ id: string }> = await response.json();
  if (!response.ok || !result.success) throw new Error(result.message || 'Publish failed');
  return result;
}

export async function publishWorkUpload(videoFile: File, title: string, coverBlob?: Blob, prompt?: string): Promise<ApiResponse<{ id: string }>> {
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('auth_token') : null;
  if (!token) throw new Error('Unauthorized');
  const form = new FormData();
  form.append('title', title);
  if (prompt) form.append('prompt', prompt);
  form.append('video', videoFile);
  if (coverBlob) form.append('cover', coverBlob, 'cover.jpg');
  const response = await fetch(`${API_BASE_URL}/works/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  const result: ApiResponse<{ id: string }> = await response.json();
  if (!response.ok || !result.success) throw new Error(result.message || 'Upload failed');
  return result;
}

export async function likeWork(id: string): Promise<ApiResponse<{ liked: boolean; like_count: number }>> {
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('auth_token') : null;
  if (!token) throw new Error('Unauthorized');
  const response = await fetch(`${API_BASE_URL}/works/${id}/like`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  const result: ApiResponse<{ liked: boolean; like_count: number }> = await response.json();
  if (!response.ok || !result.success) throw new Error(result.message || 'Like failed');
  return result;
}

export async function unlikeWork(id: string): Promise<ApiResponse<{ liked: boolean; like_count: number }>> {
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('auth_token') : null;
  if (!token) throw new Error('Unauthorized');
  const response = await fetch(`${API_BASE_URL}/works/${id}/like`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  const result: ApiResponse<{ liked: boolean; like_count: number }> = await response.json();
  if (!response.ok || !result.success) throw new Error(result.message || 'Unlike failed');
  return result;
}

export async function addWorkComment(id: string, content: string): Promise<ApiResponse<{ id: number; content: string; created_at: number; author: string }>> {
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('auth_token') : null;
  if (!token) throw new Error('Unauthorized');
  const response = await fetch(`${API_BASE_URL}/works/${id}/comments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ content }),
  });
  const result = await response.json();
  if (!response.ok || !result.success) throw new Error(result.message || 'Comment failed');
  return result;
}