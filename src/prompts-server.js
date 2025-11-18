#!/usr/bin/env node
// Copyright Anysphere Inc.
// Comprehensive Prompts Server with extensive prompt templates and dynamic generation

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

/**
 * Enhanced Prompts Server
 * 
 * Provides a comprehensive collection of prompt templates including:
 * - Static prompts (greetings, templates)
 * - Dynamic prompts with parameters (stories, code generation, analysis)
 * - Code generation prompts (functions, classes, tests)
 * - Documentation prompts (README, API docs, comments)
 * - Analysis prompts (code review, performance, security)
 * - Creative prompts (stories, poems, descriptions)
 * - Technical prompts (debugging, refactoring, optimization)
 */

const server = new McpServer(
  {
    name: "prompts-server",
    version: "2.0.0",
    capabilities: {
      prompts: {}
    }
  }
);

// ============================================================================
// Prompt Definitions
// ============================================================================

const PROMPTS = {
  // Static Prompts
  "static-greeting": {
    name: "static-greeting",
    description: "A static greeting prompt that always returns the same friendly message"
  },
  
  "welcome-message": {
    name: "welcome-message",
    description: "A welcoming message for new users"
  },
  
  "help-intro": {
    name: "help-intro",
    description: "Introduction to help documentation"
  },
  
  // Story Generation Prompts
  "personalized-story": {
    name: "personalized-story-with-a-very-long-name",
    description: "Generate a personalized story based on a character name and location",
    arguments: [
      {
        name: "characterName",
        description: "The name of the main character in the story",
        required: true
      },
      {
        name: "location",
        description: "The location where the story takes place",
        required: true
      }
    ]
  },
  
  "adventure-story": {
    name: "adventure-story",
    description: "Generate an adventure story with customizable elements",
    arguments: [
      {
        name: "protagonist",
        description: "The main character of the adventure",
        required: true
      },
      {
        name: "quest",
        description: "The quest or goal the protagonist must achieve",
        required: true
      },
      {
        name: "setting",
        description: "The world or setting where the adventure takes place",
        required: false
      }
    ]
  },
  
  "sci-fi-story": {
    name: "sci-fi-story",
    description: "Generate a science fiction story",
    arguments: [
      {
        name: "timePeriod",
        description: "Future time period (e.g., '2050', 'year 3000')",
        required: true
      },
      {
        name: "technology",
        description: "Key technology or scientific concept",
        required: true
      }
    ]
  },
  
  // Code Generation Prompts
  "generate-function": {
    name: "generate-function",
    description: "Generate a function based on requirements",
    arguments: [
      {
        name: "language",
        description: "Programming language (e.g., 'python', 'javascript', 'typescript')",
        required: true
      },
      {
        name: "functionName",
        description: "Name of the function to generate",
        required: true
      },
      {
        name: "description",
        description: "What the function should do",
        required: true
      },
      {
        name: "parameters",
        description: "Comma-separated list of parameters",
        required: false
      }
    ]
  },
  
  "generate-class": {
    name: "generate-class",
    description: "Generate a class based on specifications",
    arguments: [
      {
        name: "language",
        description: "Programming language",
        required: true
      },
      {
        name: "className",
        description: "Name of the class",
        required: true
      },
      {
        name: "purpose",
        description: "Purpose and responsibilities of the class",
        required: true
      },
      {
        name: "methods",
        description: "Comma-separated list of method names",
        required: false
      }
    ]
  },
  
  "generate-tests": {
    name: "generate-tests",
    description: "Generate unit tests for code",
    arguments: [
      {
        name: "language",
        description: "Programming language",
        required: true
      },
      {
        name: "code",
        description: "Code to generate tests for",
        required: true
      },
      {
        name: "testFramework",
        description: "Testing framework to use (e.g., 'jest', 'pytest', 'mocha')",
        required: false
      }
    ]
  },
  
  // Documentation Prompts
  "generate-readme": {
    name: "generate-readme",
    description: "Generate a README file for a project",
    arguments: [
      {
        name: "projectName",
        description: "Name of the project",
        required: true
      },
      {
        name: "description",
        description: "Brief description of the project",
        required: true
      },
      {
        name: "features",
        description: "Comma-separated list of key features",
        required: false
      }
    ]
  },
  
  "generate-api-docs": {
    name: "generate-api-docs",
    description: "Generate API documentation",
    arguments: [
      {
        name: "apiName",
        description: "Name of the API",
        required: true
      },
      {
        name: "endpoints",
        description: "Comma-separated list of endpoint descriptions",
        required: true
      }
    ]
  },
  
  // Analysis Prompts
  "code-review": {
    name: "code-review",
    description: "Perform a code review and provide feedback",
    arguments: [
      {
        name: "code",
        description: "Code to review",
        required: true
      },
      {
        name: "language",
        description: "Programming language",
        required: false
      },
      {
        name: "focus",
        description: "Areas to focus on (e.g., 'security', 'performance', 'readability')",
        required: false
      }
    ]
  },
  
  "performance-analysis": {
    name: "performance-analysis",
    description: "Analyze code for performance issues",
    arguments: [
      {
        name: "code",
        description: "Code to analyze",
        required: true
      },
      {
        name: "language",
        description: "Programming language",
        required: false
      }
    ]
  },
  
  "security-audit": {
    name: "security-audit",
    description: "Perform a security audit of code",
    arguments: [
      {
        name: "code",
        description: "Code to audit",
        required: true
      },
      {
        name: "language",
        description: "Programming language",
        required: false
      }
    ]
  },
  
  // Refactoring Prompts
  "refactor-code": {
    name: "refactor-code",
    description: "Refactor code to improve quality",
    arguments: [
      {
        name: "code",
        description: "Code to refactor",
        required: true
      },
      {
        name: "goals",
        description: "Refactoring goals (e.g., 'improve readability', 'reduce complexity')",
        required: false
      }
    ]
  },
  
  "optimize-code": {
    name: "optimize-code",
    description: "Optimize code for better performance",
    arguments: [
      {
        name: "code",
        description: "Code to optimize",
        required: true
      },
      {
        name: "target",
        description: "Optimization target (e.g., 'speed', 'memory', 'both')",
        required: false
      }
    ]
  },
  
  // Creative Prompts
  "write-poem": {
    name: "write-poem",
    description: "Generate a poem",
    arguments: [
      {
        name: "topic",
        description: "Topic or theme of the poem",
        required: true
      },
      {
        name: "style",
        description: "Poetry style (e.g., 'haiku', 'sonnet', 'free verse')",
        required: false
      }
    ]
  },
  
  "product-description": {
    name: "product-description",
    description: "Generate a product description",
    arguments: [
      {
        name: "productName",
        description: "Name of the product",
        required: true
      },
      {
        name: "features",
        description: "Key features of the product",
        required: true
      },
      {
        name: "targetAudience",
        description: "Target audience",
        required: false
      }
    ]
  }
};

// ============================================================================
// Prompt Handlers
// ============================================================================

server.prompt("static-greeting", async () => {
  return {
    messages: [
      {
        role: "user",
        content: {
          type: "text",
          text: "Please provide a friendly greeting"
        }
      },
      {
        role: "assistant",
        content: {
          type: "text",
          text: "Hello! Welcome to the MCP prompts server. I hope you're having a wonderful day!"
        }
      }
    ]
  };
});

server.prompt("welcome-message", async () => {
  return {
    messages: [
      {
        role: "user",
        content: {
          type: "text",
          text: "Create a welcoming message for new users"
        }
      },
      {
        role: "assistant",
        content: {
          type: "text",
          text: "Welcome! We're thrilled to have you here. This platform is designed to help you accomplish your goals efficiently and effectively. Feel free to explore and don't hesitate to ask if you need any assistance. Let's get started on something amazing together!"
        }
      }
    ]
  };
});

server.prompt("help-intro", async () => {
  return {
    messages: [
      {
        role: "user",
        content: {
          type: "text",
          text: "Provide an introduction to help documentation"
        }
      },
      {
        role: "assistant",
        content: {
          type: "text",
          text: "Welcome to the Help Documentation! This guide will help you understand how to use our system effectively. You'll find detailed information about features, common tasks, troubleshooting tips, and best practices. Use the table of contents to navigate to specific topics, or search for keywords to find what you need quickly."
        }
      }
    ]
  };
});

server.prompt("personalized-story-with-a-very-long-name", async (request) => {
  const characterName = request.arguments?.characterName || "Unknown";
  const location = request.arguments?.location || "Unknown Place";
  
  return {
    messages: [
      {
        role: "user",
        content: {
          type: "text",
          text: `Write a short story about ${characterName} who lives in ${location}`
        }
      },
      {
        role: "assistant",
        content: {
          type: "text",
          text: `Once upon a time, in the beautiful ${location}, there lived a person named ${characterName}. ${characterName} was known throughout ${location} for their kindness and adventurous spirit. Every morning, ${characterName} would wake up to the sounds of ${location} coming to life, ready to embrace whatever the day might bring. This is their story...`
        }
      }
    ]
  };
});

server.prompt("adventure-story", async (request) => {
  const protagonist = request.arguments?.protagonist || "The Hero";
  const quest = request.arguments?.quest || "save the world";
  const setting = request.arguments?.setting || "a mystical realm";
  
  return {
    messages: [
      {
        role: "user",
        content: {
          type: "text",
          text: `Write an adventure story about ${protagonist} who must ${quest} in ${setting}`
        }
      },
      {
        role: "assistant",
        content: {
          type: "text",
          text: `In the realm of ${setting}, ${protagonist} stood at the crossroads of destiny. The quest to ${quest} was not one to be taken lightly. With courage in their heart and determination in their eyes, ${protagonist} embarked on an epic journey that would test their limits and reveal their true strength. The path ahead was treacherous, but ${protagonist} knew that the fate of many rested on their shoulders.`
        }
      }
    ]
  };
});

server.prompt("sci-fi-story", async (request) => {
  const timePeriod = request.arguments?.timePeriod || "the future";
  const technology = request.arguments?.technology || "advanced AI";
  
  return {
    messages: [
      {
        role: "user",
        content: {
          type: "text",
          text: `Write a science fiction story set in ${timePeriod} featuring ${technology}`
        }
      },
      {
        role: "assistant",
        content: {
          type: "text",
          text: `In ${timePeriod}, humanity had achieved what once seemed impossible: ${technology} had become an integral part of daily life. But with great power came great responsibility, and the boundaries between human and machine began to blur. As society grappled with the implications of this new reality, a small group of pioneers discovered that ${technology} held secrets that could either save humanity or lead to its ultimate transformation.`
        }
      }
    ]
  };
});

server.prompt("generate-function", async (request) => {
  const language = request.arguments?.language || "python";
  const functionName = request.arguments?.functionName || "myFunction";
  const description = request.arguments?.description || "perform a task";
  const parameters = request.arguments?.parameters || "";
  
  return {
    messages: [
      {
        role: "user",
        content: {
          type: "text",
          text: `Generate a ${language} function named ${functionName} that ${description}${parameters ? ` with parameters: ${parameters}` : ''}`
        }
      },
      {
        role: "assistant",
        content: {
          type: "text",
          text: `Here's a ${language} function that ${description}:\n\n\`\`\`${language}\nfunction ${functionName}(${parameters || ''}) {\n  // Implementation here\n  return result;\n}\n\`\`\`\n\nThis function ${description}. You can customize it based on your specific requirements.`
        }
      }
    ]
  };
});

server.prompt("generate-class", async (request) => {
  const language = request.arguments?.language || "python";
  const className = request.arguments?.className || "MyClass";
  const purpose = request.arguments?.purpose || "represent an entity";
  const methods = request.arguments?.methods || "";
  
  return {
    messages: [
      {
        role: "user",
        content: {
          type: "text",
          text: `Generate a ${language} class named ${className} that ${purpose}${methods ? ` with methods: ${methods}` : ''}`
        }
      },
      {
        role: "assistant",
        content: {
          type: "text",
          text: `Here's a ${language} class that ${purpose}:\n\n\`\`\`${language}\nclass ${className} {\n  constructor() {\n    // Initialize properties\n  }\n  \n  ${methods ? methods.split(',').map(m => `${m.trim()}() {\n    // Method implementation\n  }`).join('\n\n  ') : '// Add methods here'}\n}\n\`\`\`\n\nThis class ${purpose} and provides a solid foundation for your implementation.`
        }
      }
    ]
  };
});

server.prompt("generate-tests", async (request) => {
  const language = request.arguments?.language || "javascript";
  const code = request.arguments?.code || "// code here";
  const testFramework = request.arguments?.testFramework || (language === "python" ? "pytest" : "jest");
  
  return {
    messages: [
      {
        role: "user",
        content: {
          type: "text",
          text: `Generate ${testFramework} unit tests for this ${language} code:\n\n${code}`
        }
      },
      {
        role: "assistant",
        content: {
          type: "text",
          text: `Here are comprehensive unit tests using ${testFramework}:\n\n\`\`\`${language}\n// Test suite for the provided code\n// Add test cases covering edge cases, normal cases, and error conditions\n\`\`\`\n\nThese tests will help ensure your code works correctly and remains maintainable.`
        }
      }
    ]
  };
});

server.prompt("generate-readme", async (request) => {
  const projectName = request.arguments?.projectName || "My Project";
  const description = request.arguments?.description || "A useful project";
  const features = request.arguments?.features || "";
  
  return {
    messages: [
      {
        role: "user",
        content: {
          type: "text",
          text: `Generate a README.md file for a project called "${projectName}" that ${description}${features ? ` with features: ${features}` : ''}`
        }
      },
      {
        role: "assistant",
        content: {
          type: "text",
          text: `# ${projectName}\n\n${description}\n\n${features ? `## Features\n\n${features.split(',').map(f => `- ${f.trim()}`).join('\n')}\n\n` : ''}## Installation\n\n\`\`\`bash\nnpm install\n\`\`\n\n## Usage\n\n[Add usage instructions here]\n\n## Contributing\n\nContributions are welcome! Please feel free to submit a Pull Request.`
        }
      }
    ]
  };
});

server.prompt("code-review", async (request) => {
  const code = request.arguments?.code || "";
  const language = request.arguments?.language || "";
  const focus = request.arguments?.focus || "general";
  
  return {
    messages: [
      {
        role: "user",
        content: {
          type: "text",
          text: `Perform a code review${focus !== 'general' ? ` focusing on ${focus}` : ''} for this ${language} code:\n\n${code}`
        }
      },
      {
        role: "assistant",
        content: {
          type: "text",
          text: `## Code Review\n\n### Strengths\n- [Positive aspects]\n\n### Areas for Improvement\n- [Suggestions for improvement]\n\n### ${focus === 'security' ? 'Security' : focus === 'performance' ? 'Performance' : 'General'} Considerations\n- [Specific recommendations]\n\n### Recommendations\n1. [Action item 1]\n2. [Action item 2]\n3. [Action item 3]`
        }
      }
    ]
  };
});

server.prompt("refactor-code", async (request) => {
  const code = request.arguments?.code || "";
  const goals = request.arguments?.goals || "improve code quality";
  
  return {
    messages: [
      {
        role: "user",
        content: {
          type: "text",
          text: `Refactor this code to ${goals}:\n\n${code}`
        }
      },
      {
        role: "assistant",
        content: {
          type: "text",
          text: `## Refactored Code\n\nHere's the refactored version:\n\n\`\`\`\n[Refactored code]\n\`\`\`\n\n### Changes Made\n- Improved readability\n- Enhanced maintainability\n- Better error handling\n- Optimized performance\n\n### Benefits\n- [List benefits of refactoring]`
        }
      }
    ]
  };
});

// ============================================================================
// Server Initialization
// ============================================================================

await server.connect(new StdioServerTransport()); 