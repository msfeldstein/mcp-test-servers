#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { 
  ListPromptsRequestSchema,
  GetPromptRequestSchema
} from "@modelcontextprotocol/sdk/types.js";

// Create a new MCP server
const server = new Server(
  {
    name: "prompts-server",
    version: "1.0.0"
  },
  {
    capabilities: {
      prompts: {}
    }
  }
);

// Define our prompts
const PROMPTS = {
  "static-greeting": {
    name: "static-greeting",
    description: "A static greeting prompt that always returns the same message"
  },
  "personalized-story": {
    name: "personalized-story", 
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
  }
};

// Handle listing prompts
server.setRequestHandler(ListPromptsRequestSchema, async () => {
  return {
    prompts: Object.values(PROMPTS)
  };
});

// Handle getting a specific prompt
server.setRequestHandler(GetPromptRequestSchema, async (request) => {
  const prompt = PROMPTS[request.params.name];
  
  if (!prompt) {
    throw new Error(`Prompt not found: ${request.params.name}`);
  }
  
  if (request.params.name === "static-greeting") {
    return {
      description: "A static greeting prompt",
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
  }
  
  if (request.params.name === "personalized-story") {
    const characterName = request.params.arguments?.characterName || "Unknown";
    const location = request.params.arguments?.location || "Unknown Place";
    
    return {
      description: "A personalized story",
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
  }
});

// Connect to the transport and start the server
const transport = new StdioServerTransport();
await server.connect(transport); 

// This server implements prompt functionality with both static and parameterized prompts 