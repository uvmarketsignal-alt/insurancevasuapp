import path from 'path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['tests/setupTests.ts'],
    coverage: {
      provider: 'v8',
      all: true,
      include: [
        'src/components/Layout.tsx',
        'src/lib/policyAssistantEngine.ts',
        'src/lib/whatsapp.ts',
        'src/lib/api.ts',
        'api/whatsapp-send.ts',
        'api/whatsapp-webhook.ts',
        'api/chat.ts',
        'api/health.ts',
        'api/sync.ts',
        'api/upload.ts',
      ],
      reporter: ['text', 'html'],
      reportsDirectory: 'coverage',
      thresholds: {
        lines: 100,
        functions: 100,
        branches: 100,
        statements: 100,
      },
      perFile: true,
    },
  },
});

