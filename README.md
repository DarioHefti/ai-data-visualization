# AI Data Visualization

A framework-agnostic TypeScript/JavaScript library that enables AI-powered data visualization with just a few lines of code. Users can request visualizations in plain English, and the library will generate interactive charts using their API data.

## Features

- 🤖 **AI-Powered**: Natural language to visualization generation
- 🎨 **Interactive Charts**: Built-in Chart.js integration
- 🔒 **Secure**: Sandboxed iframe execution
- 🎯 **Framework Agnostic**: Works with any web framework
- 📱 **Responsive**: Mobile-friendly visualizations
- 🌙 **Theme Support**: Light/dark mode built-in
- 📦 **Zero Dependencies**: Self-contained with CDN resources

## Installation

```bash
npm install ai-data-visualization
```

Or use directly in browser:
```html
<script src="https://unpkg.com/ai-data-visualization/dist/ai-data-visualization.min.js"></script>
```

## Quick Start

### Basic Usage

```javascript
import { create } from 'ai-data-visualization';

// Or for browser/CDN usage:
// const { create } = window.AIDataVisualization;

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

The library supports both OpenAPI/Swagger and custom API descriptions:

### OpenAPI/Swagger
```javascript
const apiDescription = JSON.stringify({
  "openapi": "3.0.0",
  "info": {
    "title": "Your API",
    "version": "1.0.0"
  },
  "paths": {
    "/api/users": {
      "get": {
        "summary": "Get all users",
        "responses": {
          "200": {
            "description": "List of users"
          }
        }
      }
    }
  }
});
```

### Custom Schema
```javascript
const apiDescription = JSON.stringify({
  "endpoints": {
    "/api/sales": {
      "method": "GET",
      "description": "Monthly sales data",
      "returns": "Array of {month: string, sales: number}"
    },
    "/api/users": {
      "method": "GET", 
      "description": "User information",
      "returns": "Array of user objects"
    }
  }
});
```

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

```css
/* Custom styling */
.my-custom-viz {
  border: 2px solid #007bff;
  border-radius: 12px;
}

.my-custom-viz .ai-data-viz__title {
  color: #007bff;
  font-size: 28px;
}

.my-custom-viz .ai-data-viz__generate-btn {
  background: linear-gradient(45deg, #007bff, #0056b3);
}
```

### Theme Customization
```css
/* Dark theme overrides */
.ai-data-viz.dark {
  --primary-color: #4dabf7;
  --background-color: #1a1a1a;
  --text-color: #ffffff;
  --border-color: #333333;
}
```

## Security

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

## Browser Support

- Chrome 60+
- Firefox 55+
- Safari 12+
- Edge 79+

## Development

### Building from Source

```bash
# Clone repository
git clone https://github.com/yourusername/ai-data-visualization.git
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

### Project Structure

```
ai-data-visualization/
├── src/
│   ├── index.ts              # Main entry point
│   ├── types.ts              # TypeScript definitions
│   └── ai-visualization.ts   # Core implementation
├── examples/
│   ├── index.html            # Vanilla JS example
├── dist/                     # Compiled output
├── package.json
├── tsconfig.json
├── webpack.config.js
└── README.md
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Support

- 📚 [Documentation](https://github.com/yourusername/ai-data-visualization)
- 🐛 [Issue Tracker](https://github.com/yourusername/ai-data-visualization/issues)
- 💬 [Discussions](https://github.com/yourusername/ai-data-visualization/discussions)

---

Made with ❤️ for developers who want AI-powered data visualization without the complexity. 