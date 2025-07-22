import { AIDataVisualization } from './ai-visualization';
import {
  AIDataVisualizationConfig,
  VisualizationState,
  ErrorType,
  AIDataVisualizationError
} from './types';

/**
 * Create a new AI Data Visualization instance
 * @param config Configuration options
 * @returns AIDataVisualization instance
 */
export function create(config: AIDataVisualizationConfig): AIDataVisualization {
  return new AIDataVisualization(config);
}

// Export all types and classes for TypeScript users
export {
  AIDataVisualization,
  AIDataVisualizationConfig,
  VisualizationState,
  ErrorType,
  AIDataVisualizationError
};

// Default export for convenience
export default {
  create,
  AIDataVisualization,
  VisualizationState,
  ErrorType,
  AIDataVisualizationError
};

// For UMD builds - attach to global if available
declare global {
  interface Window {
    AIDataVisualization?: any;
  }
}

// Ensure global export happens
const globalExport = {
  create,
  AIDataVisualization,
  VisualizationState,
  ErrorType,
  AIDataVisualizationError
};

if (typeof window !== 'undefined') {
  (window as any).AIDataVisualization = globalExport;
}

// Also make it available as module export for UMD
if (typeof module !== 'undefined' && module.exports) {
  module.exports = globalExport;
} 