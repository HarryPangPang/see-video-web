const API_HOST = _GLOBAL_VARS_.VITE_API_HOST;
const API_BASE_URL = `${API_HOST}/api`;
// 创建生成任务的请求数据接口
export interface CreateGenerationRequest {
  creationType: 'agent' | 'image' | 'video';
  model: 'seedance20' | '35pro' | '30pro' | '30fast' | '30';
  frameMode: 'omni' | 'startEnd' | 'multi' | 'subject';
  ratio: '21:9' | '16:9' | '4:3' | '1:1' | '3:4' | '9:16';
  duration: string;
  prompt: string;
  startFrame?: string; // base64 或 URL
  endFrame?: string; // base64 或 URL
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
    throw new Error('图片上传失败');
  }

  const result: ApiResponse<{ url: string }> = await response.json();

  if (!result.success || !result.data?.url) {
    throw new Error(result.message || '图片上传失败');
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

  if (!response.ok) {
    throw new Error(`请求失败: ${response.status} ${response.statusText}`);
  }

  const result: ApiResponse = await response.json();

  if (!result.success) {
    throw new Error(result.message || result.error || '生成任务创建失败');
  }

  return result;
}
// 获取所有视频列表

export async function getList(taskId: string): Promise<ApiResponse> {
  const response = await fetch(`${API_BASE_URL}/list`, {
    method: 'GET',
  });

  if (!response.ok) {
    throw new Error(`请求失败: ${response.status} ${response.statusText}`);
  }

  const result: ApiResponse = await response.json();

  return result;
}