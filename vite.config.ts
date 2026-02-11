import { ConfigEnv, defineConfig, loadEnv, ProxyOptions, UserConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

const outDir = path.resolve(__dirname, '../see-video-web/dist');
const proxy = (target: string) => {
  const ProxyList: Record<string, string | ProxyOptions> = {
    '/api': {
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
      sourcemap: false,
    },
    plugins: [react()],
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
        'Cross-Origin-Opener-Policy': 'same-origin',
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
