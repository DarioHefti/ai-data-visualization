import {
  AIDataVisualizationConfig,
  IframeMessage,
  ApiRequestData,
  ApiResponseData,
  VisualizationState,
  ErrorType,
  AIDataVisualizationError
} from './types';

// Persisted item structure for history
interface VisualizationHistoryItem {
  prompt: string;
  html: string;
  timestamp: number;
}

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
  // Store the last generated visualization code so we can send it back to the AI for improvements
  private lastGeneratedCode: string | null = null;
  // Store user requests: first original prompt and subsequent improvements
  private originalPrompt: string | null = null;
  private improvementPrompts: string[] = [];
  // Track whether the input section is collapsed
  private inputCollapsed: boolean = false;
  // History of generated visualizations
  private history: VisualizationHistoryItem[] = [];
  private readonly HISTORY_KEY = 'aiDataVizHistory';
  // Index of the history item currently being viewed/edited; null if working on a fresh visualization
  private activeHistoryIndex: number | null = null;
  // Cached HTML for API overview list
  private apiOverviewHtml: string = '';

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
    // Load persisted history
    this.loadHistory();
    // Build API overview once (no heavy logic in render loop)
    this.apiOverviewHtml = this.buildApiOverviewHtml();
    this.createHTML();
    this.attachStyles();
    this.setupEventListeners();
    this.setupMessageListener();
    // Render history list
    this.renderHistoryList();
  }

  /**
   * Create the HTML structure
   */
  private createHTML(): void {
    const theme = this.config.theme || 'light';
    const className = this.config.className || '';
    
    const apiOverviewBlock = this.apiOverviewHtml
      ? `<details class="ai-data-viz__api-overview" style="margin-top:8px;"><summary>Available API Endpoints</summary>${this.apiOverviewHtml}</details>`
      : '';

    this.container.innerHTML = `
      <div class="ai-data-viz ${theme} ${className}">
        <div class="ai-data-viz__header">
          <h2 class="ai-data-viz__title">AI Data Visualization</h2>
          <p class="ai-data-viz__subtitle">Ask for any visualization and I'll generate it using your API data</p>
          <button class="ai-data-viz__toggle-input" type="button" aria-label="Hide input">&minus;</button>
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
            <button class="ai-data-viz__clear-btn" type="button" style="display: none;">
              Clear Visualization
            </button>
          </div>
          <details class="ai-data-viz__prompt-summary" style="display:none; margin-top: 8px;">
            <summary>Original Prompt</summary>
            <pre class="ai-data-viz__prompt-text" style="white-space: pre-wrap;"></pre>
          </details>
          ${apiOverviewBlock}
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
        <details class="ai-data-viz__history" style="margin-top:12px;">
          <summary class="ai-data-viz__history-summary">
            <span>Diagram History</span>
            <button type="button" title="Clear entire history" class="ai-data-viz__history-clear-btn">&times;</button>
          </summary>
          <ul class="ai-data-viz__history-list"></ul>
        </details>
        
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
        position: relative;
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

      /* Toggle input button */
      .ai-data-viz__toggle-input {
        position: absolute;
        top: 0;
        right: 0;
        background: transparent;
        border: none;
        font-size: 24px;
        cursor: pointer;
        color: inherit;
        line-height: 1;
        padding: 4px 8px;
      }

      .ai-data-viz__toggle-input:hover {
        opacity: 0.7;
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

      /* Prompt summary */
      .ai-data-viz__prompt-summary {
        background: #f8f9fa;
        border: 1px solid #ddd;
        border-radius: 6px;
        padding: 8px;
        font-size: 12px;
        color: #333;
      }

      .ai-data-viz.dark .ai-data-viz__prompt-summary {
        background: #2a2a2a;
        border-color: #444;
        color: #ccc;
      }

      /* API overview */
      .ai-data-viz__api-overview {
        background: #f1f3f5;
        border: 1px solid #e0e0e0;
        border-radius: 6px;
        padding: 8px;
        font-size: 12px;
        color: #333;
      }

      .ai-data-viz.dark .ai-data-viz__api-overview {
        background: #252525;
        border-color: #444;
        color: #ccc;
      }

      /* Diagram history container */
      .ai-data-viz__history {
        background: #f8f9fa;
        border: 1px solid #e0e0e0;
        border-radius: 6px;
        padding: 8px;
        font-size: 12px;
        color: #333;
      }

      .ai-data-viz.dark .ai-data-viz__history {
        background: #2a2a2a;
        border-color: #444;
        color: #ccc;
      }

      /* History list */
      .ai-data-viz__history-list {
        margin: 6px 0 0 20px;
        padding: 0;
        list-style: disc;
      }
      .ai-data-viz__history-list li {
        cursor: pointer;
        padding: 4px 4px;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .ai-data-viz__history-summary {
        cursor: pointer;
        position: relative;
        padding-right: 18px; /* space for clear button */
      }
      .ai-data-viz__history-clear-btn {
        border: none;
        color: inherit;
        font-size: 14px;
        cursor: pointer;
        padding: 0;
        line-height: 1;
        position: absolute;
        right: 0;
        top: 0;
      }
      .ai-data-viz__history-btn-div {
        display: flex;
        gap: 4px;
      }
      .ai-data-viz__history-clear-btn:hover { opacity: 0.7; }
      .ai-data-viz__history-publish-btn {
        background: #007bff;
        border: none;
        color: #fff;
        font-size: 11px;
        padding: 2px 6px;
        border-radius: 4px;
        cursor: pointer;
      }
      .ai-data-viz__history-publish-btn:hover { opacity: 0.85; }
      .ai-data-viz__history-remove-btn {
        background:rgb(54, 54, 54);
        border: none;
        color: #fff;
        font-size: 11px;
        padding: 2px 6px;
        border-radius: 4px;
        cursor: pointer;
      }
      .ai-data-viz__history-remove-btn:hover { opacity: 0.7; }
      .ai-data-viz.dark .ai-data-viz__history-list li {
        border-color: #444;
      }
      .ai-data-viz__history-list li:hover {
        background: #f0f0f0;
      }
      .ai-data-viz.dark .ai-data-viz__history-list li:hover {
        background: #333;
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
    const toggleBtn = this.container.querySelector('.ai-data-viz__toggle-input') as HTMLButtonElement;
    const historyList = this.container.querySelector('.ai-data-viz__history-list') as HTMLUListElement;
    const clearHistoryBtn = this.container.querySelector('.ai-data-viz__history-clear-btn') as HTMLButtonElement;
    
    generateBtn.addEventListener('click', () => this.generateVisualization());
    clearBtn.addEventListener('click', () => this.clearVisualization());
    retryBtn.addEventListener('click', () => this.generateVisualization());
    toggleBtn.addEventListener('click', () => this.toggleInputSection());
    // History click
    historyList.addEventListener('click', (e) => {
      const publishBtn = (e.target as HTMLElement).closest('.ai-data-viz__history-publish-btn');
      const removeBtn = (e.target as HTMLElement).closest('.ai-data-viz__history-remove-btn');
      if (publishBtn) {
        e.stopPropagation();
        const li = publishBtn.closest('li');
        if (!li) return;
        const idx = parseInt(li.getAttribute('data-index') || '-1', 10);
        if (idx >= 0 && idx < this.history.length) {
          const item = this.history[idx];
          if (this.config.publishGeneratedDiagram) {
            try {
              this.config.publishGeneratedDiagram(item.html, item.prompt);
            } catch (err) {
              console.error('publishGeneratedDiagram error', err);
            }
          } else {
            console.warn('publishGeneratedDiagram callback not provided');
          }
        }
        return;
      }
      if (removeBtn) {
        e.stopPropagation();
        const li = removeBtn.closest('li');
        if (!li) return;
        const idx = parseInt(li.getAttribute('data-index') || '-1', 10);
        if (idx >= 0 && idx < this.history.length) {
          this.removeHistory(idx);
        }
        return;
      }

      const li = (e.target as HTMLElement).closest('li');
      if (!li) return;
      const index = parseInt(li.getAttribute('data-index') || '-1', 10);
      if (index >= 0 && index < this.history.length) {
        const item = this.history[index];
        // Set this history item as the active visualization context
        this.activeHistoryIndex = index;
        this.displayVisualization(item.html);
        const textarea = this.container.querySelector('.ai-data-viz__textarea') as HTMLTextAreaElement;
        textarea.value = '';
        // Update prompt summary UI
        const promptSummary = this.container.querySelector('.ai-data-viz__prompt-summary') as HTMLDetailsElement;
        const promptTextEl = this.container.querySelector('.ai-data-viz__prompt-text') as HTMLElement;
        if (promptSummary && promptTextEl) {
          promptTextEl.textContent = item.prompt;
          promptSummary.style.display = 'block';
          promptSummary.open = false;
        }
        // Prepare context for improvements
        this.originalPrompt = item.prompt;
        this.improvementPrompts = [];
        this.lastGeneratedCode = item.html;
        this.setState(VisualizationState.DISPLAYING);
      }
    });

    // Enable generate button only when there's text
    textarea.addEventListener('input', () => {
      generateBtn.disabled = !textarea.value.trim() || this.state === VisualizationState.GENERATING;
    });

    // Initial state
    generateBtn.disabled = true;

    // Clear history handler
    clearHistoryBtn.addEventListener('click', () => {
      this.clearHistory();
    });
  }

  /**
   * Toggle visibility of the input section
   */
  private toggleInputSection(): void {
    const inputSection = this.container.querySelector('.ai-data-viz__input-section') as HTMLDivElement;
    const toggleBtn = this.container.querySelector('.ai-data-viz__toggle-input') as HTMLButtonElement;

    this.inputCollapsed = !this.inputCollapsed;
    if (this.inputCollapsed) {
      inputSection.style.display = 'none';
      toggleBtn.textContent = '+';
      toggleBtn.setAttribute('aria-label', 'Show input');
    } else {
      inputSection.style.display = 'block';
      toggleBtn.textContent = '−';
      toggleBtn.setAttribute('aria-label', 'Hide input');
    }
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
      } else if (data.type === 'IFRAME_ERROR') {
        this.setState(VisualizationState.ERROR);
        this.showError(data.message || 'Visualization error');
        if (this.config.onError) {
          this.config.onError(new Error(data.message || 'Visualization error'));
        }
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
      const isImprovement = this.lastGeneratedCode !== null && this.state === VisualizationState.DISPLAYING;

      // Track prompt history
      if (isImprovement) {
        this.improvementPrompts.push(message);
      } else {
        this.originalPrompt = message;
        this.improvementPrompts = [];
      }

      this.setState(VisualizationState.GENERATING);
      this.hideError();

      const prompt = isImprovement
        ? this.buildImprovementPrompt(this.lastGeneratedCode as string)
        : this.buildVisualizationPrompt(message);

      let htmlResponse = await this.config.chatCompletion(prompt);
      htmlResponse = this.sanitizeHtmlResponse(htmlResponse);

      if (!htmlResponse || !htmlResponse.trim()) {
        throw new AIDataVisualizationError(
          ErrorType.INVALID_HTML_RESPONSE,
          'AI returned empty response'
        );
      }

      this.displayVisualization(htmlResponse);
      // Save generated code and prompt for future improvements and display
      this.lastGeneratedCode = htmlResponse;

      // Update prompt summary UI with full history
      const promptSummary = this.container.querySelector('.ai-data-viz__prompt-summary') as HTMLDetailsElement;
      const promptTextEl = this.container.querySelector('.ai-data-viz__prompt-text') as HTMLElement;
      if (promptSummary && promptTextEl) {
        const allPrompts = [this.originalPrompt, ...this.improvementPrompts].filter(Boolean).join('\n');
        promptTextEl.textContent = allPrompts;
        promptSummary.style.display = 'block';
        promptSummary.open = false; // keep collapsed by default
      }

      // Clear textarea for next improvement
      textarea.value = '';

      // Persist or replace in history
      const historyItem: VisualizationHistoryItem = { prompt: this.originalPrompt || message, html: htmlResponse, timestamp: Date.now() };
      if (isImprovement && this.activeHistoryIndex !== null) {
        this.replaceHistory(this.activeHistoryIndex, historyItem);
      } else {
        this.saveHistory(historyItem);
        this.activeHistoryIndex = 0; // newest item index
      }
      this.renderHistoryList();

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
    return `You are an expert front-end engineer who creates data visualizations.

USER REQUEST:
"${userMessage}"

AVAILABLE API ENDPOINTS (OpenAPI-like schema):
${this.config.apiDescription}

TASK:
Generate a COMPLETE, self-contained HTML document (including CSS & JavaScript) that satisfies the user's request by fetching data from the listed API endpoints. Use Chart.js (CDN: https://cdn.jsdelivr.net/npm/chart.js) or native web technologies.

REQUIREMENTS (IMPORTANT):
• Return ONLY HTML/JS/CSS code – no markdown, explanations or extra text.
• Include professional, responsive styling.
• Use the provided global function \`apiRequest(url)\` for all data calls (see usage example below).
• Handle loading states & errors gracefully within the HTML.
• Do NOT violate browser sandbox restrictions.
• Try to use all the available space for the diagram do NOT set max height or width.

EXAMPLE API USAGE:
\`\`\`js
async function loadData() {
  const data = await apiRequest('/api/your-endpoint');
  console.log(data);
}
\`\`\`

Return the finished HTML document now.`;
  }

  /**
   * Build prompt for improving an existing visualization
   */
  private buildImprovementPrompt(existingCode: string): string {
    const promptHistory = [this.originalPrompt, ...this.improvementPrompts].filter(Boolean).join('\n');
    return `You are provided with an EXISTING visualization (full HTML) generated earlier plus the complete history of user requests. Improve the visualization to satisfy the LATEST request while preserving prior context and functionality.

AVAILABLE API ENDPOINTS:
${this.config.apiDescription}

EXISTING VISUALIZATION CODE START
${existingCode}
EXISTING VISUALIZATION CODE END

FULL USER REQUEST HISTORY:
${promptHistory}

REQUIREMENTS:
• Return ONLY HTML/JS/CSS code (no explanations).
• Produce a FULL HTML document that can replace the previous one.
• Continue to use the global \`apiRequest(url)\` helper for data access.
• Keep styling modern and responsive.
• Gracefully handle loading and error states.`;
  }

  /** Display the generated visualization in iframe */
  private displayVisualization(htmlContent: string): void {
    const visualizationDiv = this.container.querySelector('.ai-data-viz__visualization') as HTMLDivElement;
    const loadingDiv = this.container.querySelector('.ai-data-viz__loading') as HTMLDivElement;
    const clearBtn = this.container.querySelector('.ai-data-viz__clear-btn') as HTMLButtonElement;

    visualizationDiv.style.display = 'block';
    loadingDiv.style.display = 'none';
    clearBtn.style.display = 'inline-block';

    const modifiedHtml = this.injectApiBridge(htmlContent);
    this.iframe = this.container.querySelector('.ai-data-viz__iframe') as HTMLIFrameElement;
    this.iframe.srcdoc = modifiedHtml;
  }

  /** Inject parent↔iframe bridge */
  private injectApiBridge(htmlContent: string): string {
    const bridge = `
<script>(function(){window.apiRequest=function(u){return new Promise((res,rej)=>{const id='req_'+Date.now()+'_'+Math.random().toString(36).substr(2,9);function h(e){const d=e.data;if(d&&d.type==='API_RESPONSE'&&d.requestId===id){window.removeEventListener('message',h);d.error?rej(new Error(d.error)):res(d.data);}}window.addEventListener('message',h);window.parent.postMessage({type:'API_REQUEST',requestId:id,url:u},'*');setTimeout(()=>{window.removeEventListener('message',h);rej(new Error('API request timeout'));},3e4);});};})();</script>
<script>window.addEventListener('error',e=>{window.parent.postMessage({type:'IFRAME_ERROR',message:e.message,stack:e.error&&e.error.stack},'*');});window.addEventListener('unhandledrejection',e=>{window.parent.postMessage({type:'IFRAME_ERROR',message:e.reason?e.reason.message||String(e.reason):'Unhandled rejection',stack:e.reason&&e.reason.stack},'*');});</script>`;

    const headClose = htmlContent.toLowerCase().indexOf('</head>');
    if (headClose !== -1) return htmlContent.slice(0, headClose) + bridge + htmlContent.slice(headClose);
    const bodyOpen = htmlContent.toLowerCase().indexOf('<body');
    if (bodyOpen !== -1) {
      const bodyTagEnd = htmlContent.indexOf('>', bodyOpen) + 1;
      return htmlContent.slice(0, bodyTagEnd) + bridge + htmlContent.slice(bodyTagEnd);
    }
    return bridge + htmlContent;
  }

  /** Clean AI response by stripping ```html or ``` code fences */
  private sanitizeHtmlResponse(raw: string): string {
    let cleaned = raw.trim();
    // Remove leading ```html or ```
    cleaned = cleaned.replace(/^```\s*html\s*/i, '').replace(/^```/, '');
    // Remove trailing ```
    cleaned = cleaned.replace(/```\s*$/i, '').trim();
    return cleaned;
  }

  /** Clear current visualization */
  public clearVisualization(): void {
    const visualizationDiv = this.container.querySelector('.ai-data-viz__visualization') as HTMLDivElement;
    const clearBtn = this.container.querySelector('.ai-data-viz__clear-btn') as HTMLButtonElement;

    visualizationDiv.style.display = 'none';
    clearBtn.style.display = 'none';

    this.setState(VisualizationState.IDLE);
    this.hideError();

    if (this.iframe) { this.iframe.srcdoc = ''; }
    this.iframe = undefined as any;

    this.lastGeneratedCode = null;
    this.activeHistoryIndex = null;
    this.originalPrompt = null;
    this.improvementPrompts = [];

    const promptSummary = this.container.querySelector('.ai-data-viz__prompt-summary') as HTMLDetailsElement;
    const promptTextEl = this.container.querySelector('.ai-data-viz__prompt-text') as HTMLElement;
    if (promptSummary && promptTextEl) { promptSummary.style.display = 'none'; promptTextEl.textContent = ''; }
  }

  /** Update UI state */
  private setState(state: VisualizationState): void {
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
      case VisualizationState.DISPLAYING:
        generateBtn.disabled = !textarea.value.trim();
        btnText.textContent = 'Improve Visualization';
        btnSpinner.style.display = 'none';
        textarea.disabled = false;
        break;
      case VisualizationState.IDLE:
      case VisualizationState.ERROR:
        generateBtn.disabled = !textarea.value.trim();
        btnText.textContent = 'Generate Visualization';
        btnSpinner.style.display = 'none';
        textarea.disabled = false;
        break;
    }
  }

  private showError(msg: string): void {
    const errorDiv = this.container.querySelector('.ai-data-viz__error') as HTMLDivElement;
    const p = this.container.querySelector('.ai-data-viz__error-message') as HTMLParagraphElement;
    p.textContent = msg; errorDiv.style.display = 'block';
  }

  private hideError(): void {
    const errorDiv = this.container.querySelector('.ai-data-viz__error') as HTMLDivElement;
    errorDiv.style.display = 'none';
  }

  public destroy(): void {
    if (this.messageListener) window.removeEventListener('message', this.messageListener);
    this.container.innerHTML = '';
    this.iframe = undefined as any;
  }

  public getState(): VisualizationState { return this.state; }

  public setTheme(theme: 'light'|'dark'|'auto'): void {
    const vizDiv = this.container.querySelector('.ai-data-viz') as HTMLDivElement;
    vizDiv.className = `ai-data-viz ${theme} ${this.config.className || ''}`;
    this.config.theme = theme;
  }

  /** (re)build simple API overview list */
  private buildApiOverviewHtml(): string {
    try {
      const parsed = JSON.parse(this.config.apiDescription);
      if (!parsed || typeof parsed !== 'object' || !parsed.paths) return '';
      const items: string[] = [];
      for (const path in parsed.paths) {
        const methods = parsed.paths[path];
        if (methods) {
          for (const m in methods) {
            const summary = methods[m]?.summary || '';
            items.push(`<li><code>${m.toUpperCase()} ${path}</code>${summary ? ' - '+summary : ''}</li>`);
          }
        }
      }
      return items.length ? `<ul style="margin:8px 0 0 16px;">${items.join('')}</ul>` : '';
    } catch { return ''; }
  }

  private loadHistory(): void {
    try { const raw = localStorage.getItem(this.HISTORY_KEY); if (raw) this.history = JSON.parse(raw); } catch {}
  }

  private saveHistory(item: VisualizationHistoryItem): void {
    this.history.unshift(item); this.history = this.history.slice(0,10);
    try { localStorage.setItem(this.HISTORY_KEY, JSON.stringify(this.history)); } catch {}
  }

  private replaceHistory(idx: number, item: VisualizationHistoryItem): void {
    if (idx<0||idx>=this.history.length) return; this.history[idx]=item;
    try { localStorage.setItem(this.HISTORY_KEY, JSON.stringify(this.history)); } catch {}
  }

  private renderHistoryList(): void {
    const list = this.container.querySelector('.ai-data-viz__history-list') as HTMLUListElement | null;
    if (!list) return; list.innerHTML='';
    this.history.forEach((item,idx)=>{
      const li=document.createElement('li'); li.setAttribute('data-index',String(idx));
      const span=document.createElement('span'); span.textContent=`${new Date(item.timestamp).toLocaleString()} — ${item.prompt.slice(0,60)}`;

      const btnDiv = document.createElement('div');
      btnDiv.className = 'ai-data-viz__history-btn-div';
      const btn=document.createElement('button'); btn.type='button'; btn.textContent='Publish'; btn.className='ai-data-viz__history-publish-btn';
      const rmBtn=document.createElement('button'); rmBtn.type='button'; rmBtn.textContent='Remove'; rmBtn.className='ai-data-viz__history-remove-btn';

      btnDiv.appendChild(btn); btnDiv.appendChild(rmBtn);
      li.appendChild(span); li.appendChild(btnDiv); list.appendChild(li);
    });
  }

  private clearHistory(): void {
    this.history=[]; this.activeHistoryIndex=null; try{localStorage.removeItem(this.HISTORY_KEY);}catch{} this.renderHistoryList();
  }

  private removeHistory(idx: number): void {
    if (idx < 0 || idx >= this.history.length) return;
    this.history.splice(idx,1);
    try { localStorage.setItem(this.HISTORY_KEY, JSON.stringify(this.history)); } catch {}
    this.renderHistoryList();
  }
} 