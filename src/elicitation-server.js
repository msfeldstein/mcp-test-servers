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

// Enum elicitation tool
server.tool(
  "ask-favorite-color",
  "Ask the user to select their favorite color from a list",
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
            enum: ["Red", "Blue", "Green", "Yellow", "Purple", "Orange", "Pink", "Black", "White", "Gray"]
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


// Connect to the transport and start the server
await server.connect(new StdioServerTransport());