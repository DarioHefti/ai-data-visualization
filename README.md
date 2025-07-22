# AI Data Visualization

Let users create their own charts. No more, could you please add this to the diagram bla.

A library that let's a user generate data visualization based on the specified endpoints in your backend. AI will generate the code and it will be sandboxed in an iframe. The data is getting fetched from your specified API endpoints.


## Installation

```bash
npm install @darioh/ai-data-visualization
```

## Quick Start

### Basic Usage

```javascript
import { create } from '@darioh/ai-data-visualization';

const viz = create({
  container: '#visualization-container',
  apiDescription: JSON.stringify(yourApiSchema),
  chatCompletion: async (message, apiDescription) => {
    // Your AI service integration (OpenAI, Claude, etc.)
    const response = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, apiDescription })
    });
    return response.text();
  },
  apiRequest: async (url) => {
    // Your API request handler
    const response = await fetch(url, {
      headers: { 'Authorization': 'Bearer ' + yourApiKey }
    });
    return response.json();
  },
  onError: (error) => console.error('Visualization error:', error)
});
```

## Configuration Options

```typescript
interface AIDataVisualizationConfig {
  // Required
  container: string | HTMLElement;          // CSS selector or DOM element
  apiDescription: string;                   // API schema as JSON string
  chatCompletion: (message: string, apiDescription: string) => Promise<string>;
  apiRequest: (url: string) => Promise<any>;

  // Optional
  onError?: (error: Error) => void;         // Error callback
  theme?: 'light' | 'dark' | 'auto';        // UI theme
  className?: string;                       // Custom CSS class
  iframeHeight?: number;                    // Iframe height in pixels (default: 600)
}
```

## API Description Format

We will send your API endpoints to your AI-model so it can automatically generate the code for the diagrams and knows where and what to fetch.

If you want it to work then the API endpoints need to be self explanatory with good naming conventions and you will need to specify the return type for the apis!
something like the following works great:

### Example Endpoint description
```javascript
const apiDescription =  const apiSchema = JSON.stringify({
            "openapi": "3.0.0",
            "info": {
                "title": "Weather API",
                "version": "1.0.0",
                "description": "Simple weather data API for visualizations"
            },
            "servers": [
                {
                    "url": "http://localhost:3001",
                    "description": "Local development server"
                }
            ],
            "paths": {
                "/api/cities": {
                    "get": {
                        "summary": "Get all available cities",
                        "responses": {
                            "200": {
                                "description": "List of cities with coordinates",
                                "content": {
                                    "application/json": {
                                        "schema": {
                                            "type": "object",
                                            "properties": {
                                                "success": {"type": "boolean"},
                                                "data": {
                                                    "type": "array",
                                                    "items": {
                                                        "type": "object",
                                                        "properties": {
                                                            "id": {"type": "integer"},
                                                            "name": {"type": "string"},
                                                            "country": {"type": "string"},
                                                            "lat": {"type": "number"},
                                                            "lon": {"type": "number"}
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }}}});
```

if you are using the format above then we will parse your endpoints end show them to the user.
what you need is 1: json 2: paths 3: summary

## AI Integration Examples

### OpenAI
```javascript
async function chatCompletion(message, apiDescription) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: `You are a data visualization generator. Generate HTML/CSS/JavaScript code using Chart.js for the user's request. API Description: ${apiDescription}`
        },
        {
          role: 'user',
          content: message
        }
      ]
    })
  });

  const data = await response.json();
  return data.choices[0].message.content;
}
```

## API Methods

### Instance Methods

```javascript
const viz = create(config);

// Generate visualization from user input
await viz.generateVisualization();

// Clear current visualization
viz.clearVisualization();

// Change theme
viz.setTheme('dark');

// Get current state
const state = viz.getState(); // 'idle' | 'generating' | 'displaying' | 'error'

// Clean up
viz.destroy();
```

## Styling and Customization

### Custom CSS Classes
```javascript
const viz = create({
  // ... other config
  className: 'my-custom-viz',
  theme: 'light'
});
```

## "Security"

The library uses sandboxed iframes for generated visualizations with restricted permissions:

- `allow-scripts`: Enables Chart.js and visualization code

Generated HTML is executed in isolation and cannot access:
- Parent page DOM
- Cookies or localStorage
- Cross-origin resources (except CDN)

## Example User Requests

Users can ask for visualizations in natural language:

- "Create a bar chart showing sales by region"
- "Generate a pie chart of user demographics" 
- "Show me a line graph of monthly revenue trends"
- "Display employee data in a table with charts"
- "Create an interactive dashboard for project metrics"

## Error Handling

```javascript
const viz = create({
  // ... config
  onError: (error) => {
    console.error('Visualization error:', error);
    
    switch (error.type) {
      case 'container-not-found':
        // Handle container issues
        break;
      case 'chat-completion-failed':
        // Handle AI service errors
        break;
      case 'api-request-failed':
        // Handle API errors
        break;
      default:
        // Handle other errors
        break;
    }
  }
});
```

### Check out the example like so

```bash
# Clone repository
git clone https://github.com/DarioHefti/ai-data-visualization.git
cd ai-data-visualization

# Install dependencies
npm install

# Build package
npm run build

# Run development server
npm run dev

# Watch mode
npm run watch
```