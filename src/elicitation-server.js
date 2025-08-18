#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

// Create a new MCP server with stdio transport
const server = new McpServer(
  {
    name: "elicitation-server",
    version: "1.0.0",
    capabilities: {
      elicitation: {},
      tools: {}
    }
  }
);

// Simple tool that asks user for their name
server.tool(
  "ask-name",
  "Ask the user for their name",
  {},
  async () => {
    const result = await server.server.elicitInput({
      message: "What is your name?",
      requestedSchema: {
        type: "object",
        properties: {
          name: {
            type: "string",
            title: "Your name",
            description: "Please enter your name"
          }
        },
        required: ["name"]
      }
    });

    if (result.action === "accept" && result.content?.name) {
      return {
        content: [{
          type: "text",
          text: `Hello, ${result.content.name}! Nice to meet you.`
        }]
      };
    }

    return {
      content: [{
        type: "text",
        text: "No name provided."
      }]
    };
  }
);

// Simple yes/no question
server.tool(
  "multi-step-elicitation",
  "Ask for a couple of elicitations about pizza",
  {},
  async () => {
    const result = await server.server.elicitInput({
      message: "Do you like pizza?",
      requestedSchema: {
        type: "object",
        properties: {
          likes_pizza: {
            type: "boolean",
            title: "Enjoyment",
            description: "Select yes or no"
          }
        },
        required: ["likes_pizza"]
      }
    });

    if (result.action === "accept" && result.content?.likes_pizza) {
      // Ask about favorite topping if they like pizza
      const toppingResult = await server.server.elicitInput({
        message: "What's your favorite pizza topping?",
        requestedSchema: {
          type: "object",
          properties: {
            favorite_topping: {
              type: "string",
              title: "Favorite Topping",
              description: "Enter your favorite pizza topping"
            }
          },
          required: ["favorite_topping"]
        }
      });

      if (toppingResult.action === "accept" && toppingResult.content?.favorite_topping) {
        return {
          content: [{
            type: "text",
            text: `You answered: Yes. Pizza is great! Your favorite topping is ${toppingResult.content.favorite_topping}. Excellent choice!`
          }]
        };
      } else {
        return {
          content: [{
            type: "text",
            text: "You answered: Yes. Pizza is great! But you didn't share your favorite topping."
          }]
        };
      }
    } else if (result.action === "accept") {
      return {
        content: [{
          type: "text",
          text: "You answered: No. That's okay, everyone has different tastes."
        }]
      };
    }

    return {
      content: [{
        type: "text",
        text: "No answer provided."
      }]
    };
  }
);

// Enum elicitation tool with raw values
server.tool(
  "ask-favorite-color",
  "Ask the user to select their favorite color from a list (raw enum values)",
  {},
  async () => {
    const result = await server.server.elicitInput({
      message: "What's your favorite color?",
      requestedSchema: {
        type: "object",
        properties: {
          favorite_color: {
            type: "string",
            title: "Favorite Color",
            description: "Select your favorite color from the options",
            enum: ["red", "blue", "green", "yellow", "purple", "orange", "pink", "black", "white", "gray"]
          }
        },
        required: ["favorite_color"]
      }
    });

    if (result.action === "accept" && result.content?.favorite_color) {
      return {
        content: [{
          type: "text",
          text: `Great choice! ${result.content.favorite_color} is a beautiful color. It says a lot about your personality!`
        }]
      };
    }

    return {
      content: [{
        type: "text",
        text: "No color selected."
      }]
    };
  }
);

// Enum elicitation tool with enumNames for better UX
server.tool(
  "ask-programming-language",
  "Ask the user to select their favorite programming language with user-friendly display names",
  {},
  async () => {
    const result = await server.server.elicitInput({
      message: "What's your favorite programming language?",
      requestedSchema: {
        type: "object",
        properties: {
          programming_language: {
            type: "string",
            title: "Programming Language",
            description: "Select your favorite programming language",
            enum: ["js", "py", "rs", "go", "java", "cpp", "cs", "rb", "php", "swift"],
            enumNames: ["JavaScript", "Python", "Rust", "Go", "Java", "C++", "C#", "Ruby", "PHP", "Swift"]
          }
        },
        required: ["programming_language"]
      }
    });

    if (result.action === "accept" && result.content?.programming_language) {
      const languageMap = {
        "js": "JavaScript",
        "py": "Python", 
        "rs": "Rust",
        "go": "Go",
        "java": "Java",
        "cpp": "C++",
        "cs": "C#",
        "rb": "Ruby",
        "swift": "Swift"
      };
      
      const displayName = languageMap[result.content.programming_language] || result.content.programming_language;
      
      return {
        content: [{
          type: "text",
          text: `Excellent choice! ${displayName} is a powerful language. The actual value returned was: "${result.content.programming_language}"`
        }]
      };
    }

    return {
      content: [{
        type: "text",
        text: "No programming language selected."
      }]
    };
  }
);

// Delete project elicitation tool with realistic fake project names
server.tool(
  "delete-project",
  "Delete a project",
  {},
  async () => {
    const result = await server.server.elicitInput({
      message: "⚠️ Which project would you like to delete? This action cannot be undone!",
      requestedSchema: {
        type: "object",
        properties: {
          project_name: {
            type: "string",
            title: "Project to Delete",
            description: "Select the project you want to permanently delete",
            enum: [
              "ecommerce-backend",
              "mobile-app-frontend", 
              "data-analytics-dashboard",
              "user-authentication-service",
              "payment-processing-api",
              "inventory-management-system",
              "customer-support-chatbot",
              "marketing-automation-tools",
              "social-media-integration",
              "reporting-microservice",
              "file-storage-service",
              "notification-system"
            ],
            enumNames: [
              "E-commerce Backend (Node.js)",
              "Mobile App Frontend (React Native)",
              "Data Analytics Dashboard (Python/Django)",
              "User Authentication Service (Go)",
              "Payment Processing API (Java Spring)",
              "Inventory Management System (C# .NET)",
              "Customer Support Chatbot (Python/FastAPI)",
              "Marketing Automation Tools (Ruby on Rails)",
              "Social Media Integration (Node.js/Express)",
              "Reporting Microservice (Rust)",
              "File Storage Service (AWS Lambda)",
              "Notification System (Kafka/Scala)"
            ]
          }
        },
        required: ["project_name"]
      }
    });

    if (result.action === "accept" && result.content?.project_name) {
      const projectMap = {
        "ecommerce-backend": "E-commerce Backend (Node.js)",
        "mobile-app-frontend": "Mobile App Frontend (React Native)",
        "data-analytics-dashboard": "Data Analytics Dashboard (Python/Django)",
        "user-authentication-service": "User Authentication Service (Go)",
        "payment-processing-api": "Payment Processing API (Java Spring)",
        "inventory-management-system": "Inventory Management System (C# .NET)",
        "customer-support-chatbot": "Customer Support Chatbot (Python/FastAPI)",
        "marketing-automation-tools": "Marketing Automation Tools (Ruby on Rails)",
        "social-media-integration": "Social Media Integration (Node.js/Express)",
        "reporting-microservice": "Reporting Microservice (Rust)",
        "file-storage-service": "File Storage Service (AWS Lambda)",
        "notification-system": "Notification System (Kafka/Scala)"
      };
      
      const displayName = projectMap[result.content.project_name] || result.content.project_name;
      
      return {
        content: [{
          type: "text",
          text: `🗑️ Project "${displayName}" has been successfully deleted!\n\n⚠️ All associated resources, databases, and deployments have been removed.\n\nProject ID: ${result.content.project_name}\n\nThis action cannot be undone. If you need to restore this project, you'll need to recreate it from your backup or version control system.`
        }]
      };
    }

    return {
      content: [{
        type: "text",
        text: "❌ Project deletion cancelled. No project was selected."
      }]
    };
  }
);


// Connect to the transport and start the server
await server.connect(new StdioServerTransport());