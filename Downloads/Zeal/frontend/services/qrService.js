import { API_BASE } from './apiClient';

const DEFAULT_SIZE = 300;
const MIN_SIZE = 96;
const MAX_SIZE = 1024;

const DEFAULT_MARGIN = 1;
const MIN_MARGIN = 0;
const MAX_MARGIN = 8;

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export const buildBackendQrUrl = (payload, options = {}) => {
  const safePayload = String(payload || '').trim();
  if (!safePayload) {
    return '';
  }

  const safeSize = clamp(Number(options.size) || DEFAULT_SIZE, MIN_SIZE, MAX_SIZE);
  const safeMargin = clamp(Number(options.margin) || DEFAULT_MARGIN, MIN_MARGIN, MAX_MARGIN);

  return `${API_BASE}/qr/render?payload=${encodeURIComponent(safePayload)}&size=${safeSize}&margin=${safeMargin}`;
};
