/**
 * Google OAuth 重定向方式登录（不依赖弹窗，避免 gsi/transform 空白页）
 * 需在 Google Cloud Console 的 OAuth 客户端中配置「已授权的重定向 URI」：
 * - 开发: http://localhost:5173/
 * - 生产: https://你的域名/
 */

const GOOGLE_AUTH_BASE = 'https://accounts.google.com/o/oauth2/v2/auth';

export function buildGoogleRedirectUrl(clientId: string): string {
  if (!clientId) return '';
  const redirectUri = typeof window !== 'undefined'
    ? `${window.location.origin}${window.location.pathname.replace(/\/$/, '')}/`
    : '';
  const scope = 'openid email profile';
  const nonce = Math.random().toString(36).slice(2) + Date.now();
  if (typeof window !== 'undefined') {
    try {
      sessionStorage.setItem('google_oauth_nonce', nonce);
    } catch (_) {}
  }
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'id_token',
    scope,
    nonce,
  });
  return `${GOOGLE_AUTH_BASE}?${params.toString()}`;
}

/**
 * 从当前页 hash 中解析 Google 回调的 id_token（重定向方式登录回调）
 */
export function parseIdTokenFromHash(): string | null {
  if (typeof window === 'undefined') return null;
  const hash = window.location.hash.slice(1);
  if (!hash) return null;
  const params = new URLSearchParams(hash);
  return params.get('id_token');
}
  