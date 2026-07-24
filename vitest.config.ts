import { defineConfig } from 'vitest/config';

// Vitest runs the pure geometry / edge-reshape / edge-routing unit tests. These
// exercise plain functions whose only `ng-diagram` imports are type-only (erased
// at runtime), so no Angular TestBed or DOM is needed — a Node environment with
// esbuild TS transform is sufficient. Component/TestBed specs, if added later,
// can switch to jsdom + @analogjs/vitest-angular.
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.spec.ts'],
  },
});
