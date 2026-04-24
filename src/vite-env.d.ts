/// <reference types="vite/client" />

import type { DeplogApi } from "./shared/types";

declare global {
  interface Window {
    deplog: DeplogApi;
  }
}

export {};
