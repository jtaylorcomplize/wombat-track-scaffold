/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_LOOKER_CLIENT_ID: string
  readonly VITE_LOOKER_CLIENT_SECRET: string
  readonly VITE_LOOKER_HOST: string
  readonly VITE_LOOKER_DASHBOARD_ID: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}