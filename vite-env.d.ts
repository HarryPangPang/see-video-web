declare module '*.svg'
declare module '*.png'
declare module '*.jpg'
declare module '*.jpeg'
declare module '*.gif'
declare module '*.bmp'
declare module '*.tiff'
declare module '*.json'
declare module '*.mp4'
declare module '*.webm'
declare module '*.ogg'
declare module '*.mp3'
declare module '*.wav'
declare module '*.flac'
declare module '*.aac'
declare module '*.md?raw'

declare module '*.less' {
  const classes: Readonly<Record<string, string>>
  export default classes
}

/// <reference types="vite/client" />

// 支持 .md?raw 导入
declare module '*.md?raw' {
  const content: string
  export default content
}

interface ImportMetaEnv {
  readonly MODE: string
  readonly VITE_APP_PORT: string
  readonly VITE_APP_NAME: string
  readonly VITE_APP_PROXY: string
  readonly VITE_APP_OFFLINE_DIR: string
  readonly VITE_APP_BASE_URL: string
  readonly VITE_APP_PUBLIC_PATH: string
}

declare const _GLOBAL_VARS_: ImportMetaEnv

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare module 'react/jsx-runtime' {
  export default any
}
