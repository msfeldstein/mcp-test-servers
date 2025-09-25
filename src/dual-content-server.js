#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

// Create a new MCP server that demonstrates different outputs for structuredContent and content
const server = new McpServer(
  {
    name: "dual-content-server",
    version: "1.0.0",
    capabilities: {
      tools: {
        "analyze_text": {
          description: "Analyzes text and returns both structured data and human-readable content",
          parameters: {
            type: "object",
            properties: {
              text: {
                type: "string",
                description: "The text to analyze"
              }
            },
            required: ["text"]
          },
          outputSchema: {
            type: "object",
            properties: {
              wordCount: {
                type: "number",
                description: "Number of words in the text"
              },
              characterCount: {
                type: "number",
                description: "Number of characters in the text"
              },
              sentenceCount: {
                type: "number",
                description: "Number of sentences in the text"
              },
              averageWordLength: {
                type: "number",
                description: "Average length of words"
              },
              longestWord: {
                type: "string",
                description: "The longest word found"
              }
            },
            required: ["wordCount", "characterCount", "sentenceCount", "averageWordLength", "longestWord"]
          }
        },
        "format_data": {
          description: "Formats user data into both structured JSON and formatted text",
          parameters: {
            type: "object",
            properties: {
              name: {
                type: "string",
                description: "Person's name"
              },
              age: {
                type: "number",
                description: "Person's age"
              },
              city: {
                type: "string",
                description: "Person's city"
              }
            },
            required: ["name", "age", "city"]
          },
          outputSchema: {
            type: "object",
            properties: {
              id: {
                type: "string",
                description: "Generated user ID"
              },
              profile: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  age: { type: "number" },
                  city: { type: "string" },
                  category: { type: "string" }
                },
                required: ["name", "age", "city", "category"]
              },
              timestamp: {
                type: "string",
                description: "ISO timestamp of creation"
              }
            },
            required: ["id", "profile", "timestamp"]
          }
        }
      }
    }
  }
);

// Register the analyze_text tool
server.tool("analyze_text", {
  text: z.string().describe("The text to analyze")
}, async (params) => {
  const text = params.text;
  
  // Calculate statistics
  const words = text.trim().split(/\s+/).filter(word => word.length > 0);
  const wordCount = words.length;
  const characterCount = text.length;
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const sentenceCount = sentences.length;
  const averageWordLength = wordCount > 0 ? words.reduce((sum, word) => sum + word.length, 0) / wordCount : 0;
  const longestWord = words.reduce((longest, word) => word.length > longest.length ? word : longest, "");

  // Structured data for machines
  const structuredData = {
    wordCount,
    characterCount,
    sentenceCount,
    averageWordLength: Math.round(averageWordLength * 100) / 100,
    longestWord
  };

  // Human-readable content
  const humanContent = `📊 Text Analysis Results

📝 **Original Text:** "${text}"

📈 **Statistics:**
• Words: ${wordCount}
• Characters: ${characterCount}
• Sentences: ${sentenceCount}
• Average word length: ${Math.round(averageWordLength * 100) / 100} characters
• Longest word: "${longestWord}" (${longestWord.length} characters)

🎯 **Quick Summary:** This text contains ${wordCount} words across ${sentenceCount} sentences, with an average word length of ${Math.round(averageWordLength * 100) / 100} characters.`;

  return {
    structuredContent: structuredData,
    content: [{
      type: "text",
      text: humanContent
    }]
  };
});

// Register the format_data tool
server.tool("format_data", {
  name: z.string().describe("Person's name"),
  age: z.number().describe("Person's age"),
  city: z.string().describe("Person's city")
}, async (params) => {
  const { name, age, city } = params;
  
  // Generate structured data
  const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const category = age < 18 ? "minor" : age < 65 ? "adult" : "senior";
  const timestamp = new Date().toISOString();

  const structuredData = {
    id: userId,
    profile: {
      name,
      age,
      city,
      category
    },
    timestamp
  };

  // Human-readable formatted content
  const formattedContent = `👤 **User Profile Created**

🆔 **ID:** ${userId}
📅 **Created:** ${new Date(timestamp).toLocaleString()}

👨‍👩‍👧‍👦 **Personal Information:**
• **Name:** ${name}
• **Age:** ${age} years old
• **City:** ${city}
• **Category:** ${category.charAt(0).toUpperCase() + category.slice(1)}

✅ **Status:** Profile successfully created and ready for use!

💾 **Machine Data:** The structured data has been generated with all required fields for API integration.`;

  return {
    structuredContent: structuredData,
    content: [{
      type: "text", 
      text: formattedContent
    }]
  };
});

// Connect to the transport and start the server
await server.connect(new StdioServerTransport());

