import { api } from './services/api.js';

export async function bootstrap() {
  // entry point for future SPA wiring
  return api.health();
}
