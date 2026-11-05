import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    mockReset: true, // reset all mocks between tests
    env: {
      // VERCEL stops app.listen() from running on import
      VERCEL: '1',
      FRONTEND_URL: 'http://localhost:5173',
      KV_REST_API_URL: 'http://localhost',
      KV_REST_API_TOKEN: 'test-token',
    },
    coverage: {
      provider: 'v8',
      include: ['src/**/*.js'],
      reporter: ['text', 'html'],
    },
  },
});
