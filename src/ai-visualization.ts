import {
  AIDataVisualizationConfig,
  IframeMessage,
  ApiRequestData,
  ApiResponseData,
  VisualizationState,
  ErrorType,
  AIDataVisualizationError
} from './types';

/**
 * Main AI Data Visualization class
 */
export class AIDataVisualization {
  private container: HTMLElement;
  private config: AIDataVisualizationConfig;
  private state: VisualizationState = VisualizationState.IDLE;
  private iframe?: HTMLIFrameElement;
  // Removed unused pendingRequests map to reduce memory footprint and complexity
  // private pendingRequests = new Map<string, { resolve: (data: any) => void; reject: (error: Error) => void }>();
  private messageListener?: (event: MessageEvent) => void;

  constructor(config: AIDataVisualizationConfig) {
    this.config = config;
    this.container = this.resolveContainer(config.container);
    this.validateConfig();
    this.initialize();
  }

  /**
   * Resolve container element from string selector or HTMLElement
   */
  private resolveContainer(container: string | HTMLElement): HTMLElement {
    if (typeof container === 'string') {
      const element = document.querySelector(container) as HTMLElement;
      if (!element) {
        throw new AIDataVisualizationError(
          ErrorType.CONTAINER_NOT_FOUND,
          `Container element not found: ${container}`
        );
      }
      return element;
    }
    return container;
  }

  /**
   * Validate configuration
   */
  private validateConfig(): void {
    if (!this.config.apiDescription) {
      throw new AIDataVisualizationError(
        ErrorType.INVALID_API_DESCRIPTION,
        'API description is required'
      );
    }

    if (typeof this.config.chatCompletion !== 'function') {
      throw new AIDataVisualizationError(
        ErrorType.CHAT_COMPLETION_FAILED,
        'chatCompletion must be a function'
      );
    }

    if (typeof this.config.apiRequest !== 'function') {
      throw new AIDataVisualizationError(
        ErrorType.API_REQUEST_FAILED,
        'apiRequest must be a function'
      );
    }
  }

  /**
   * Initialize the visualization component
   */
  private initialize(): void {
    this.createHTML();
    this.attachStyles();
    this.setupEventListeners();
    this.setupMessageListener();
  }

  /**
   * Create the HTML structure
   */
  private createHTML(): void {
    const theme = this.config.theme || 'light';
    const className = this.config.className || '';
    
    this.container.innerHTML = `
      <div class="ai-data-viz ${theme} ${className}">
        <div class="ai-data-viz__header">
          <h2 class="ai-data-viz__title">AI Data Visualization</h2>
          <p class="ai-data-viz__subtitle">Ask for any visualization and I'll generate it using your API data</p>
        </div>
        
        <div class="ai-data-viz__input-section">
          <div class="ai-data-viz__input-group">
            <textarea 
              class="ai-data-viz__textarea" 
              placeholder="Example: Create a chart showing employee allocation by department"
              rows="3"
            ></textarea>
            <button class="ai-data-viz__generate-btn" type="button">
              <span class="ai-data-viz__btn-text">Generate Visualization</span>
              <div class="ai-data-viz__spinner" style="display: none;"></div>
            </button>
          </div>
          <button class="ai-data-viz__clear-btn" type="button" style="display: none;">
            Clear Visualization
          </button>
        </div>
        
        <div class="ai-data-viz__visualization" style="display: none;">
          <div class="ai-data-viz__loading" style="display: none;">
            <div class="ai-data-viz__spinner"></div>
            <p>Generating visualization...</p>
          </div>
          <div class="ai-data-viz__iframe-container">
            <iframe class="ai-data-viz__iframe" sandbox="allow-scripts"></iframe>
          </div>
        </div>
        
        <div class="ai-data-viz__error" style="display: none;">
          <div class="ai-data-viz__error-content">
            <p class="ai-data-viz__error-message"></p>
            <button class="ai-data-viz__error-retry" type="button">Try Again</button>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Attach CSS styles
   */
  private attachStyles(): void {
    if (document.getElementById('ai-data-viz-styles')) {
      return; // Styles already loaded
    }

    const style = document.createElement('style');
    style.id = 'ai-data-viz-styles';
    style.textContent = this.getStyles();
    document.head.appendChild(style);
  }

  /**
   * Get CSS styles
   */
  private getStyles(): string {
    return `
      .ai-data-viz {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        max-width: 1200px;
        margin: 0 auto;
        padding: 20px;
        border: 1px solid #e0e0e0;
        border-radius: 8px;
        background: #ffffff;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      }

      .ai-data-viz.dark {
        background: #1a1a1a;
        border-color: #333;
        color: #ffffff;
      }

      .ai-data-viz__header {
        margin-bottom: 24px;
        text-align: center;
      }

      .ai-data-viz__title {
        margin: 0 0 8px 0;
        font-size: 24px;
        font-weight: 600;
        color: #333;
      }

      .ai-data-viz.dark .ai-data-viz__title {
        color: #ffffff;
      }

      .ai-data-viz__subtitle {
        margin: 0;
        color: #666;
        font-size: 14px;
      }

      .ai-data-viz.dark .ai-data-viz__subtitle {
        color: #ccc;
      }

      .ai-data-viz__input-section {
        margin-bottom: 20px;
      }

      .ai-data-viz__input-group {
        display: flex;
        gap: 12px;
        margin-bottom: 12px;
      }

      .ai-data-viz__textarea {
        flex: 1;
        padding: 12px;
        border: 1px solid #ddd;
        border-radius: 6px;
        font-family: inherit;
        font-size: 14px;
        resize: vertical;
        min-height: 80px;
      }

      .ai-data-viz.dark .ai-data-viz__textarea {
        background: #2a2a2a;
        border-color: #444;
        color: #ffffff;
      }

      .ai-data-viz__textarea:focus {
        outline: none;
        border-color: #007bff;
        box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
      }

      .ai-data-viz__generate-btn {
        padding: 12px 24px;
        background: #007bff;
        color: white;
        border: none;
        border-radius: 6px;
        font-family: inherit;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        transition: background-color 0.2s;
        display: flex;
        align-items: center;
        gap: 8px;
        min-width: 180px;
        justify-content: center;
      }

      .ai-data-viz__generate-btn:hover:not(:disabled) {
        background: #0056b3;
      }

      .ai-data-viz__generate-btn:disabled {
        background: #6c757d;
        cursor: not-allowed;
      }

      .ai-data-viz__clear-btn {
        padding: 8px 16px;
        background: transparent;
        color: #dc3545;
        border: 1px solid #dc3545;
        border-radius: 6px;
        font-family: inherit;
        font-size: 14px;
        cursor: pointer;
        transition: all 0.2s;
      }

      .ai-data-viz__clear-btn:hover {
        background: #dc3545;
        color: white;
      }

      .ai-data-viz__spinner {
        width: 16px;
        height: 16px;
        border: 2px solid transparent;
        border-top: 2px solid currentColor;
        border-radius: 50%;
        animation: spin 1s linear infinite;
      }

      @keyframes spin {
        to { transform: rotate(360deg); }
      }

      .ai-data-viz__visualization {
        margin-top: 20px;
      }

      .ai-data-viz__loading {
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 40px;
        color: #666;
      }

      .ai-data-viz.dark .ai-data-viz__loading {
        color: #ccc;
      }

      .ai-data-viz__loading p {
        margin-top: 12px;
      }

      .ai-data-viz__iframe-container {
        border: 1px solid #e0e0e0;
        border-radius: 6px;
        overflow: hidden;
      }

      .ai-data-viz.dark .ai-data-viz__iframe-container {
        border-color: #444;
      }

      .ai-data-viz__iframe {
        width: 100%;
        height: ${this.config.iframeHeight || 600}px;
        border: none;
        background: white;
      }

      .ai-data-viz__error {
        margin-top: 20px;
        padding: 16px;
        background: #f8d7da;
        border: 1px solid #f5c6cb;
        border-radius: 6px;
        color: #721c24;
      }

      .ai-data-viz.dark .ai-data-viz__error {
        background: #2d1b1e;
        border-color: #5a1a1a;
        color: #f8d7da;
      }

      .ai-data-viz__error-content {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
      }

      .ai-data-viz__error-message {
        margin: 0;
        flex: 1;
      }

      .ai-data-viz__error-retry {
        padding: 6px 12px;
        background: #dc3545;
        color: white;
        border: none;
        border-radius: 4px;
        font-size: 12px;
        cursor: pointer;
      }

      .ai-data-viz__error-retry:hover {
        background: #c82333;
      }

      @media (max-width: 768px) {
        .ai-data-viz {
          padding: 16px;
        }

        .ai-data-viz__input-group {
          flex-direction: column;
        }

        .ai-data-viz__generate-btn {
          min-width: auto;
        }

        .ai-data-viz__iframe {
          height: 400px;
        }
      }
    `;
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    const textarea = this.container.querySelector('.ai-data-viz__textarea') as HTMLTextAreaElement;
    const generateBtn = this.container.querySelector('.ai-data-viz__generate-btn') as HTMLButtonElement;
    const clearBtn = this.container.querySelector('.ai-data-viz__clear-btn') as HTMLButtonElement;
    const retryBtn = this.container.querySelector('.ai-data-viz__error-retry') as HTMLButtonElement;

    generateBtn.addEventListener('click', () => this.generateVisualization());
    clearBtn.addEventListener('click', () => this.clearVisualization());
    retryBtn.addEventListener('click', () => this.generateVisualization());

    // Enable generate button only when there's text
    textarea.addEventListener('input', () => {
      generateBtn.disabled = !textarea.value.trim() || this.state === VisualizationState.GENERATING;
    });

    // Initial state
    generateBtn.disabled = true;
  }

  /**
   * Setup message listener for iframe communication
   */
  private setupMessageListener(): void {
    this.messageListener = (event: MessageEvent) => {
      // Ignore messages from unknown sources to prevent malicious injections
      if (event.source !== this.iframe?.contentWindow) {
        return;
      }

      const data = event.data as IframeMessage;
      if (data.type === 'API_REQUEST' && data.requestId && data.url) {
        this.handleApiRequest(data as ApiRequestData);
      }
    };

    window.addEventListener('message', this.messageListener);
  }

  /**
   * Handle API requests from iframe
   */
  private async handleApiRequest(requestData: ApiRequestData): Promise<void> {
    const { requestId, url } = requestData;

    try {
      const response = await this.config.apiRequest(url);
      this.sendMessageToIframe({
        type: 'API_RESPONSE',
        requestId,
        data: response
      });
    } catch (error) {
      this.sendMessageToIframe({
        type: 'API_RESPONSE',
        requestId,
        error: error instanceof Error ? error.message : 'API request failed'
      });
    }
  }

  /**
   * Send message to iframe
   */
  private sendMessageToIframe(message: ApiResponseData): void {
    if (this.iframe?.contentWindow) {
      this.iframe.contentWindow.postMessage(message, '*');
    }
  }

  /**
   * Generate visualization based on user input
   */
  public async generateVisualization(): Promise<void> {
    const textarea = this.container.querySelector('.ai-data-viz__textarea') as HTMLTextAreaElement;
    const message = textarea.value.trim();

    if (!message) {
      this.showError('Please enter a visualization request');
      return;
    }

    try {
      this.setState(VisualizationState.GENERATING);
      this.hideError();

      const prompt = this.buildVisualizationPrompt(message);
      const htmlResponse = await this.config.chatCompletion(prompt);

      if (!htmlResponse || !htmlResponse.trim()) {
        throw new AIDataVisualizationError(
          ErrorType.INVALID_HTML_RESPONSE,
          'AI returned empty response'
        );
      }

      this.displayVisualization(htmlResponse);
      this.setState(VisualizationState.DISPLAYING);
      
    } catch (error) {
      this.setState(VisualizationState.ERROR);
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate visualization';
      this.showError(errorMessage);
      
      if (this.config.onError) {
        this.config.onError(error instanceof Error ? error : new Error(errorMessage));
      }
    }
  }

  /**
   * Build the prompt for AI visualization generation
   */
  private buildVisualizationPrompt(userMessage: string): string {
    return `Based on the available API endpoints, please generate complete HTML/JavaScript/CSS code to visualize: "${userMessage}".

IMPORTANT REQUIREMENTS:
- Return ONLY HTML/JavaScript/CSS code, NO OTHER TEXT
- Generate a complete, self-contained HTML document
- Include all necessary CSS styling for a modern, responsive design
- Load Chart.js from CDN: https://cdn.jsdelivr.net/npm/chart.js
- Use the provided apiRequest function to fetch data from endpoints
- Create interactive visualizations using Chart.js or native HTML/CSS
- Handle loading states and errors gracefully
- Use a professional color scheme and layout

CRITICAL API INTEGRATION:
The apiRequest function is automatically available in your code. Use it like this:

async function loadData() {
  try {
    const response = await apiRequest('/api/your-endpoint');
    // Use the response data for your visualization
    console.log('Data loaded:', response);
  } catch (error) {
    console.error('Failed to load data:', error);
    // Show error message to user
  }
}

Remember: The generated code will be executed in a sandboxed iframe with automatic API request handling.`;
  }

  /**
   * Display the generated visualization in iframe
   */
  private displayVisualization(htmlContent: string): void {
    const visualizationDiv = this.container.querySelector('.ai-data-viz__visualization') as HTMLDivElement;
    const loadingDiv = this.container.querySelector('.ai-data-viz__loading') as HTMLDivElement;
    const clearBtn = this.container.querySelector('.ai-data-viz__clear-btn') as HTMLButtonElement;
    
    // Show visualization section
    visualizationDiv.style.display = 'block';
    loadingDiv.style.display = 'none';
    clearBtn.style.display = 'inline-block';

    // Inject API bridge script into the HTML content
    const modifiedHtmlContent = this.injectApiBridge(htmlContent);

    // Create and setup iframe
    this.iframe = this.container.querySelector('.ai-data-viz__iframe') as HTMLIFrameElement;
    this.iframe.srcdoc = modifiedHtmlContent;
  }

  /**
   * Inject API bridge script into HTML content
   */
  private injectApiBridge(htmlContent: string): string {
    const apiBridgeScript = `
<script>
(function() {
  // Define apiRequest function for iframe communication
  window.apiRequest = function(url) {
    return new Promise((resolve, reject) => {
      const requestId = 'req_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      
      const messageHandler = (event) => {
        const data = event.data;
        if (data && data.type === 'API_RESPONSE' && data.requestId === requestId) {
          window.removeEventListener('message', messageHandler);
          if (data.error) {
            reject(new Error(data.error));
          } else {
            resolve(data.data);
          }
        }
      };

      window.addEventListener('message', messageHandler);

      // Send request to parent window
      window.parent.postMessage({
        type: 'API_REQUEST',
        requestId: requestId,
        url: url
      }, '*');
      
      // Add timeout to prevent hanging requests
      setTimeout(() => {
        window.removeEventListener('message', messageHandler);
        reject(new Error('API request timeout'));
      }, 30000);
    });
  };
})();
</script>`;

    // Find the closing head tag or opening body tag to inject the script
    const headCloseIndex = htmlContent.toLowerCase().indexOf('</head>');
    const bodyOpenIndex = htmlContent.toLowerCase().indexOf('<body');
    
    if (headCloseIndex !== -1) {
      // Inject before closing head tag
      return htmlContent.slice(0, headCloseIndex) + apiBridgeScript + htmlContent.slice(headCloseIndex);
    } else if (bodyOpenIndex !== -1) {
      // Inject after opening body tag
      const bodyTagEnd = htmlContent.indexOf('>', bodyOpenIndex) + 1;
      return htmlContent.slice(0, bodyTagEnd) + apiBridgeScript + htmlContent.slice(bodyTagEnd);
    } else {
      // Fallback: prepend to the content
      return apiBridgeScript + htmlContent;
    }
  }

  /**
   * Clear the current visualization
   */
  public clearVisualization(): void {
    const visualizationDiv = this.container.querySelector('.ai-data-viz__visualization') as HTMLDivElement;
    const clearBtn = this.container.querySelector('.ai-data-viz__clear-btn') as HTMLButtonElement;
    const textarea = this.container.querySelector('.ai-data-viz__textarea') as HTMLTextAreaElement;
    
    visualizationDiv.style.display = 'none';
    clearBtn.style.display = 'none';
    textarea.value = '';
    
    this.setState(VisualizationState.IDLE);
    this.hideError();
    
         if (this.iframe) {
       this.iframe.srcdoc = '';
       this.iframe = undefined as any;
     }
  }

  /**
   * Set the current state and update UI
   */
  private setState(state: VisualizationState): void {
    this.state = state;
    
    const generateBtn = this.container.querySelector('.ai-data-viz__generate-btn') as HTMLButtonElement;
    const btnText = generateBtn.querySelector('.ai-data-viz__btn-text') as HTMLSpanElement;
    const btnSpinner = generateBtn.querySelector('.ai-data-viz__spinner') as HTMLDivElement;
    const textarea = this.container.querySelector('.ai-data-viz__textarea') as HTMLTextAreaElement;
    
    switch (state) {
      case VisualizationState.GENERATING:
        generateBtn.disabled = true;
        btnText.textContent = 'Generating...';
        btnSpinner.style.display = 'block';
        textarea.disabled = true;
        break;
        
      case VisualizationState.IDLE:
      case VisualizationState.DISPLAYING:
      case VisualizationState.ERROR:
        generateBtn.disabled = !textarea.value.trim();
        btnText.textContent = 'Generate Visualization';
        btnSpinner.style.display = 'none';
        textarea.disabled = false;
        break;
    }
  }

  /**
   * Show error message
   */
  private showError(message: string): void {
    const errorDiv = this.container.querySelector('.ai-data-viz__error') as HTMLDivElement;
    const errorMessage = this.container.querySelector('.ai-data-viz__error-message') as HTMLParagraphElement;
    
    errorMessage.textContent = message;
    errorDiv.style.display = 'block';
  }

  /**
   * Hide error message
   */
  private hideError(): void {
    const errorDiv = this.container.querySelector('.ai-data-viz__error') as HTMLDivElement;
    errorDiv.style.display = 'none';
  }

  /**
   * Destroy the visualization instance and clean up
   */
  public destroy(): void {
    if (this.messageListener) {
      window.removeEventListener('message', this.messageListener);
    }
    
         // pendingRequests map removed – nothing to clear
     this.container.innerHTML = '';
     this.iframe = undefined as any;
  }

  /**
   * Get current state
   */
  public getState(): VisualizationState {
    return this.state;
  }

  /**
   * Update theme
   */
  public setTheme(theme: 'light' | 'dark' | 'auto'): void {
    const vizDiv = this.container.querySelector('.ai-data-viz') as HTMLDivElement;
    vizDiv.className = `ai-data-viz ${theme} ${this.config.className || ''}`;
    this.config.theme = theme;
  }
} 