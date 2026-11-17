export interface ErrorResponse {
  code: string;
  message: string;
  details?: unknown;
  timestamp: string;
  path: string;
}
