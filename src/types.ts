/**
 * Configuration options for creating an AI Data Visualization instance
 */
export interface AIDataVisualizationConfig {
  /** The container element or CSS selector where the visualization will be rendered */
  container: string | HTMLElement;
  
  /** API description as a string (supports OpenAPI/Swagger JSON or custom schema) */
  apiDescription: string;
  
  /** Function to handle chat completion requests */
  chatCompletion: (message: string) => Promise<string>;
  
  /** Function to handle GET API requests */
  apiRequest: (url: string) => Promise<any>;
  
  /** Optional error handler callback */
  onError?: (error: Error) => void;
  
  /** Optional theme configuration */
  theme?: 'light' | 'dark' | 'auto';
  
  /** Optional custom CSS class name for styling */
  className?: string;
  
  /** Optional iframe height (default: 600px) */
  iframeHeight?: number;
}

/**
 * Internal message types for iframe communication
 */
export interface IframeMessage {
  type: 'API_REQUEST' | 'API_RESPONSE' | 'IFRAME_ERROR';
  requestId?: string;
  url?: string;
  data?: any;
  error?: string;
  message?: string;
  stack?: string;
}

/**
 * API request data structure
 */
export interface ApiRequestData {
  type: 'API_REQUEST';
  requestId: string;
  url: string;
}

/**
 * API response data structure
 */
export interface ApiResponseData {
  type: 'API_RESPONSE';
  requestId: string;
  data?: any;
  error?: string;
}

/**
 * Visualization state enum
 */
export enum VisualizationState {
  IDLE = 'idle',
  GENERATING = 'generating',
  DISPLAYING = 'displaying',
  ERROR = 'error'
}

/**
 * Error types that can occur
 */
export enum ErrorType {
  CONTAINER_NOT_FOUND = 'container-not-found',
  INVALID_API_DESCRIPTION = 'invalid-api-description',
  CHAT_COMPLETION_FAILED = 'chat-completion-failed',
  API_REQUEST_FAILED = 'api-request-failed',
  IFRAME_COMMUNICATION_FAILED = 'iframe-communication-failed',
  INVALID_HTML_RESPONSE = 'invalid-html-response'
}

/**
 * Custom error class for AI Data Visualization errors
 */
export class AIDataVisualizationError extends Error {
  constructor(
    public readonly type: ErrorType,
    message: string,
    public readonly originalError?: Error
  ) {
    super(message);
    this.name = 'AIDataVisualizationError';
  }
} 