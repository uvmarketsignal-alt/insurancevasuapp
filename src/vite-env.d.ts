/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly VITE_SYNC_SECRET?: string;
  /** When "true", Policy Assistant shows optional server-side OpenAI enhancement. */
  readonly VITE_ENABLE_AI_CHAT?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
