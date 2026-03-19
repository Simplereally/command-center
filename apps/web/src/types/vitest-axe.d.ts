/// <reference types="vitest" />

declare module 'vitest' {
  interface Assertion {
    toHaveNoViolations(): this;
  }
}
