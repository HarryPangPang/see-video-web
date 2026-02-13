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

// 获取即梦视频列表
export async function getVideoList(): Promise<ApiResponse> {
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('auth_token') : null;
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const response = await fetch(`${API_BASE_URL}/video-list`, {
    method: 'GET',
    headers,
  });

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status} ${response.statusText}`);
  }

  const result: ApiResponse = await response.json();

  return result;
}