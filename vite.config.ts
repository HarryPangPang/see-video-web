import { ConfigEnv, defineConfig, loadEnv, ProxyOptions, UserConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import fs from 'node:fs';

const outDir = path.resolve(__dirname, '../see-video-server/dist');

/** 构建前删除 see-video-server/dist */
function cleanServerDist() {
  return {
    name: 'clean-server-dist',
    buildStart() {
      if (fs.existsSync(outDir)) {
        fs.rmSync(outDir, { recursive: true });
      }
    },
  };
}
const proxy = (target: string) => {
  const ProxyList: Record<string, string | ProxyOptions> = {
    '/api': {
      target,
      changeOrigin: true,
    },
    '/assets': {
      target,
      changeOrigin: true,
    },
  }
  return ProxyList
}

export default defineConfig(({ command, mode }: ConfigEnv): UserConfig=>{
  const isBuild = command === 'build'
  const root = process.cwd()
  console.log('mode', mode)
  const env = loadEnv(mode, root)
  const {  VITE_APP_PORT, VITE_APP_PROXY } = env
  return {
    build: {
      outDir: isBuild ? outDir : 'dist',
      emptyOutDir: true,
      sourcemap: false,
    },
    plugins: [react(), cleanServerDist()],
    optimizeDeps: {
      exclude: ['esbuild-wasm']
    },
    worker: {
      format: 'es',
    },
    server: {
      host: '0.0.0.0',
      port: parseInt(VITE_APP_PORT),
      proxy: proxy(VITE_APP_PROXY),
      hmr: {
        overlay: false,
      },
      headers: {
        'Service-Worker-Allowed': '/',
        'Cross-Origin-Embedder-Policy': 'require-corp',
        // 必须为 same-origin-allow-popups，否则 Google 登录弹窗会空白
        'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
      }
    },
     // 全局变量替换 Record<string, string>
     define: {
      _GLOBAL_VARS_: JSON.stringify({
        ...env,
        MODE: mode,
      }),
    },
  }
});
