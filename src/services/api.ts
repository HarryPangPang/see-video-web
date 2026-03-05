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

// 当前用户资料（/me、更新资料、头像接口返回）
export interface AuthUserProfile {
  id: number;
  email: string;
  username: string | null;
  avatar?: string | null;
  bio?: string | null;
  location?: string | null;
  website?: string | null;
  isGoogleUser?: boolean;
}

export interface UpdateProfileParams {
  username: string;
  bio?: string;
  location?: string;
  website?: string;
}

export async function updateUserProfile(params: UpdateProfileParams): Promise<ApiResponse<AuthUserProfile>> {
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('auth_token') : null;
  if (!token) throw new Error('Unauthorized');
  const body: Record<string, string> = { username: params.username.trim() };
  if (params.bio !== undefined) body.bio = params.bio;
  if (params.location !== undefined) body.location = params.location;
  if (params.website !== undefined) body.website = params.website;
  const response = await fetch(`${API_BASE_URL}/user/profile`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  const result: ApiResponse<AuthUserProfile> = await response.json();
  if (!response.ok || !result.success) throw new Error(result.message || '更新失败');
  return result;
}

// 上传头像
export async function uploadAvatar(file: File): Promise<ApiResponse<AuthUserProfile>> {
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('auth_token') : null;
  if (!token) throw new Error('Unauthorized');
  const form = new FormData();
  form.append('avatar', file);
  const response = await fetch(`${API_BASE_URL}/user/avatar`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  const result: ApiResponse<AuthUserProfile> = await response.json();
  if (!response.ok || !result.success) throw new Error(result.message || '上传头像失败');
  return result;
}

// 恢复默认头像（清除自定义头像）
export async function removeAvatar(): Promise<ApiResponse<AuthUserProfile>> {
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('auth_token') : null;
  if (!token) throw new Error('Unauthorized');
  const response = await fetch(`${API_BASE_URL}/user/avatar`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  const result: ApiResponse<AuthUserProfile> = await response.json();
  if (!response.ok || !result.success) throw new Error(result.message || '恢复默认头像失败');
  return result;
}

// 修改密码（仅邮箱注册用户）
export async function changePassword(currentPassword: string, newPassword: string): Promise<ApiResponse<void>> {
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('auth_token') : null;
  if (!token) throw new Error('Unauthorized');
  const response = await fetch(`${API_BASE_URL}/user/password`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ currentPassword, newPassword }),
  });
  const result: ApiResponse<void> = await response.json();
  if (!response.ok || !result.success) throw new Error(result.message || '修改密码失败');
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

// ========== 邀请与分佣 ==========

export interface ReferralMeData {
  inviteCode: string;
  inviteUrl: string | null;
  level1Count: number;
  level2Count: number;
  level3Count: number;
  totalCommissionEarned: number;
}

export async function getReferralMe(): Promise<ApiResponse<ReferralMeData>> {
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('auth_token') : null;
  if (!token) throw new Error('Unauthorized');
  const response = await fetch(`${API_BASE_URL}/referral/me`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
  const result: ApiResponse<ReferralMeData> = await response.json();
  if (!response.ok || !result.success) throw new Error(result.message || '获取邀请信息失败');
  return result;
}

export interface ReferralTeamItem {
  id: number;
  username: string | null;
  avatar: string | null;
  created_at: number;
}

export async function getReferralTeam(level: 1 | 2 | 3, limit?: number, offset?: number): Promise<ApiResponse<{ list: ReferralTeamItem[]; total: number }>> {
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('auth_token') : null;
  if (!token) throw new Error('Unauthorized');
  const params = new URLSearchParams({ level: String(level) });
  if (limit != null) params.set('limit', String(limit));
  if (offset != null) params.set('offset', String(offset));
  const response = await fetch(`${API_BASE_URL}/referral/team?${params}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
  const result = await response.json();
  if (!response.ok || !result.success) throw new Error(result.message || '获取团队列表失败');
  return result;
}

export interface ReferralCommissionItem {
  id: number;
  amount: number;
  related_id: string;
  description: string;
  created_at: number;
}

export async function getReferralCommissions(limit?: number, offset?: number): Promise<ApiResponse<{ list: ReferralCommissionItem[]; total: number }>> {
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('auth_token') : null;
  if (!token) throw new Error('Unauthorized');
  const params = new URLSearchParams();
  if (limit != null) params.set('limit', String(limit));
  if (offset != null) params.set('offset', String(offset));
  const response = await fetch(`${API_BASE_URL}/referral/commissions?${params}`, { method: 'GET', headers: { Authorization: `Bearer ${token}` } });
  const result = await response.json();
  if (!response.ok || !result.success) throw new Error(result.message || '获取分佣记录失败');
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
  liked?: boolean;
  is_private?: number;
}

export interface WorkDetail extends WorkItem {
  liked: boolean;
  is_following: boolean;
  follower_count: number;
  comments: { id: number; content: string; created_at: number; author: string }[];
}

export interface WorksListParams {
  sort?: 'newest' | 'likes' | 'foryou' | 'following';
  page?: number;
  limit?: number;
  mine?: boolean;
  source?: 'jimeng' | 'upload';
  isPrivate?: boolean;
  userId?: number;
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
  if (params?.isPrivate !== undefined) qs.set('isPrivate', String(params.isPrivate));
  if (params?.userId !== undefined) qs.set('userId', String(params.userId));
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

export async function publishWork(videoGenerationId: string, title: string, coverBlob?: Blob): Promise<ApiResponse<{ id: string }>> {
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('auth_token') : null;
  if (!token) throw new Error('Unauthorized');
  let body: BodyInit;
  const headers: Record<string, string> = { Authorization: `Bearer ${token}` };
  if (coverBlob) {
    const form = new FormData();
    form.append('videoGenerationId', videoGenerationId);
    form.append('title', title);
    form.append('cover', coverBlob, 'cover.jpg');
    body = form;
  } else {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify({ videoGenerationId, title });
  }
  const response = await fetch(`${API_BASE_URL}/works`, { method: 'POST', headers, body });
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

export async function hideWork(id: string): Promise<ApiResponse<null>> {
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('auth_token') : null;
  if (!token) throw new Error('Unauthorized');
  const response = await fetch(`${API_BASE_URL}/works/${id}/hide`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  const result: ApiResponse<null> = await response.json();
  if (!response.ok || !result.success) throw new Error(result.message || 'Hide failed');
  return result;
}

export async function unhideWork(id: string): Promise<ApiResponse<null>> {
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('auth_token') : null;
  if (!token) throw new Error('Unauthorized');
  const response = await fetch(`${API_BASE_URL}/works/${id}/hide`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  const result: ApiResponse<null> = await response.json();
  if (!response.ok || !result.success) throw new Error(result.message || 'Unhide failed');
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

export async function followUser(userId: number): Promise<ApiResponse<{ is_following: boolean; follower_count: number }>> {
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('auth_token') : null;
  if (!token) throw new Error('Unauthorized');
  const response = await fetch(`${API_BASE_URL}/users/${userId}/follow`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  const result = await response.json();
  if (!response.ok || !result.success) throw new Error(result.message || 'Follow failed');
  return result;
}

export async function unfollowUser(userId: number): Promise<ApiResponse<{ is_following: boolean; follower_count: number }>> {
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('auth_token') : null;
  if (!token) throw new Error('Unauthorized');
  const response = await fetch(`${API_BASE_URL}/users/${userId}/follow`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  const result = await response.json();
  if (!response.ok || !result.success) throw new Error(result.message || 'Unfollow failed');
  return result;
}

// 公开主页资料（GET /users/:id/profile）
export interface UserProfile {
  id: number;
  name: string;
  avatar?: string | null;
  bio?: string | null;
  location?: string | null;
  website?: string | null;
  followers: number;
  following: number;
  likes_received: number;
  is_following: boolean;
}

export interface UserListItem {
  id: number;
  name: string;
}

export async function getMyStats(): Promise<ApiResponse<{ followers: number; following: number; likes_received: number }>> {
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('auth_token') : null;
  if (!token) throw new Error('Unauthorized');
  const response = await fetch(`${API_BASE_URL}/users/me/stats`, { headers: { Authorization: `Bearer ${token}` } });
  const result = await response.json();
  if (!response.ok || !result.success) throw new Error(result.message || 'Failed');
  return result;
}

export async function getMyLikes(page = 1, limit = 20): Promise<ApiResponse<{ list: WorkItem[]; total: number; hasMore: boolean }>> {
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('auth_token') : null;
  if (!token) throw new Error('Unauthorized');
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  const response = await fetch(`${API_BASE_URL}/users/me/likes?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const result = await response.json();
  if (!response.ok || !result.success) throw new Error(result.message || 'Failed');
  return result;
}

export async function getUserProfile(userId: number): Promise<ApiResponse<UserProfile>> {
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('auth_token') : null;
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const response = await fetch(`${API_BASE_URL}/users/${userId}/profile`, { headers });
  const result = await response.json();
  if (!response.ok || !result.success) throw new Error(result.message || 'User not found');
  return result;
}

export async function getUserFollowers(userId: number): Promise<ApiResponse<UserListItem[]>> {
  const response = await fetch(`${API_BASE_URL}/users/${userId}/followers`);
  const result = await response.json();
  if (!response.ok || !result.success) throw new Error(result.message || 'Failed');
  return result;
}

export async function getUserFollowing(userId: number): Promise<ApiResponse<UserListItem[]>> {
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('auth_token') : null;
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const response = await fetch(`${API_BASE_URL}/users/${userId}/following`, { headers });
  const result = await response.json();
  if (!response.ok || !result.success) throw new Error(result.message || 'Failed');
  return result;
}