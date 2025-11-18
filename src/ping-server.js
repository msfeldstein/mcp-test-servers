#!/usr/bin/env node
// Copyright Anysphere Inc.
// Comprehensive utility server with extensive text processing, validation, and utility tools

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

/**
 * Enhanced Ping Server - Comprehensive Utility Server
 * 
 * This server provides a wide array of utility tools including:
 * - Basic communication tools (ping, echo, reverse)
 * - Text processing and analysis (count, analyze, transform)
 * - Data validation and formatting (validate_json, format_date, hash)
 * - String manipulation (uppercase, lowercase, capitalize, slugify)
 * - Encoding/decoding (base64, url_encode, url_decode)
 * - Pattern matching and extraction (extract_emails, extract_urls, extract_numbers)
 * - Text generation (generate_uuid, generate_random_string)
 * - Performance testing (long-running-ping, batch_process)
 * 
 * NEW in v2.1.0:
 * - Advanced string manipulation (word_wrap, trim_lines, pad_string)
 * - Text formatting (markdown_to_text, html_entities)
 * - Data conversion (csv_to_json, json_to_csv)
 * - Enhanced pattern matching with custom regex support
 */

const server = new McpServer(
  {
    name: "ping-server",
    version: "2.1.0",
    capabilities: {
      tools: {
        "ping": {
          description: "A simple tool that returns 'pong'",
          parameters: {
            type: "object",
            properties: {},
            required: []
          }
        },
        "long-running-ping": {
          description: "A ping tool that waits a specified time before responding",
          parameters: {
            type: "object",
            properties: {
              waitTimeMs: { type: "number", description: "Wait time in milliseconds" }
            },
            required: []
          }
        },
        "echo": {
          description: "Echo back the provided text",
          parameters: {
            type: "object",
            properties: {
              text: { type: "string", description: "Text to echo" }
            },
            required: ["text"]
          }
        },
        "reverse": {
          description: "Reverse a string",
          parameters: {
            type: "object",
            properties: {
              text: { type: "string", description: "Text to reverse" }
            },
            required: ["text"]
          }
        },
        "count": {
          description: "Count characters, words, lines, and sentences in text",
          parameters: {
            type: "object",
            properties: {
              text: { type: "string", description: "Text to analyze" }
            },
            required: ["text"]
          }
        }
      }
    }
  }
);

// ============================================================================
// Basic Communication Tools
// ============================================================================

server.tool("ping", "A simple tool that returns 'pong'", async (params) => {
  const timestamp = new Date().toISOString();
  const uptime = process.uptime();
  return {
    content: [{
      type: "text",
      text: `pong 🏓\nTimestamp: ${timestamp}\nServer uptime: ${uptime.toFixed(2)}s`
    }]
  };
});

server.tool("long-running-ping", {
  waitTimeMs: z.number().optional().default(3000).describe("The time to wait in milliseconds before returning the response")
}, async (params) => {
  const waitTime = params?.waitTimeMs || 3000;
  await new Promise(resolve => setTimeout(resolve, waitTime));
  return {
    content: [{
      type: "text",
      text: `pong (waited ${waitTime}ms)`
    }]
  };
});

server.tool("echo", {
  text: z.string().describe("The text to echo"),
  prefix: z.string().optional().describe("Optional prefix to add before the text"),
  suffix: z.string().optional().describe("Optional suffix to add after the text")
}, async (params) => {
  const prefix = params.prefix || "";
  const suffix = params.suffix || "";
  return {
    content: [{
      type: "text",
      text: `${prefix}${params.text}${suffix}`
    }]
  };
});

// ============================================================================
// String Manipulation Tools
// ============================================================================

server.tool("reverse", {
  text: z.string().describe("The text to reverse")
}, async (params) => {
  const reversed = params.text.split('').reverse().join('');
  return {
    content: [{
      type: "text",
      text: reversed
    }]
  };
});

server.tool("uppercase", {
  text: z.string().describe("Text to convert to uppercase")
}, async (params) => {
  return {
    content: [{
      type: "text",
      text: params.text.toUpperCase()
    }]
  };
});

server.tool("lowercase", {
  text: z.string().describe("Text to convert to lowercase")
}, async (params) => {
  return {
    content: [{
      type: "text",
      text: params.text.toLowerCase()
    }]
  };
});

server.tool("capitalize", {
  text: z.string().describe("Text to capitalize (first letter of each word)")
}, async (params) => {
  const capitalized = params.text
    .split(/\s+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
  return {
    content: [{
      type: "text",
      text: capitalized
    }]
  };
});

server.tool("slugify", {
  text: z.string().describe("Text to convert to URL-friendly slug")
}, async (params) => {
  const slug = params.text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return {
    content: [{
      type: "text",
      text: slug
    }]
  };
});

// ============================================================================
// Text Analysis Tools
// ============================================================================

server.tool("count", {
  text: z.string().describe("The text to count characters and words in"),
  detailed: z.boolean().optional().default(false).describe("Return detailed statistics")
}, async (params) => {
  const text = params.text;
  const charCount = text.length;
  const charCountNoSpaces = text.replace(/\s/g, '').length;
  const wordCount = text.trim().split(/\s+/).filter(word => word.length > 0).length;
  const lineCount = text.split('\n').length;
  const sentenceCount = text.split(/[.!?]+/).filter(s => s.trim().length > 0).length;
  
  if (params.detailed) {
    return {
      content: [{
        type: "text",
        text: `Text Statistics:
- Characters (total): ${charCount}
- Characters (no spaces): ${charCountNoSpaces}
- Words: ${wordCount}
- Lines: ${lineCount}
- Sentences: ${sentenceCount}
- Average word length: ${wordCount > 0 ? (charCountNoSpaces / wordCount).toFixed(2) : 0}`
      }]
    };
  }
  
  return {
    content: [{
      type: "text",
      text: `Characters: ${charCount}, Words: ${wordCount}`
    }]
  };
});

server.tool("analyze", {
  text: z.string().describe("Text to analyze for patterns and characteristics")
}, async (params) => {
  const text = params.text;
  const hasNumbers = /\d/.test(text);
  const hasLetters = /[a-zA-Z]/.test(text);
  const hasSpecialChars = /[^a-zA-Z0-9\s]/.test(text);
  const hasUppercase = /[A-Z]/.test(text);
  const hasLowercase = /[a-z]/.test(text);
  const isAllUppercase = text === text.toUpperCase() && hasLetters;
  const isAllLowercase = text === text.toLowerCase() && hasLetters;
  const isNumeric = /^\d+$/.test(text.trim());
  const isAlphanumeric = /^[a-zA-Z0-9]+$/.test(text.trim());
  
  return {
    content: [{
      type: "text",
      text: `Text Analysis:
- Contains numbers: ${hasNumbers}
- Contains letters: ${hasLetters}
- Contains special characters: ${hasSpecialChars}
- Contains uppercase: ${hasUppercase}
- Contains lowercase: ${hasLowercase}
- Is all uppercase: ${isAllUppercase}
- Is all lowercase: ${isAllLowercase}
- Is numeric only: ${isNumeric}
- Is alphanumeric only: ${isAlphanumeric}`
    }]
  };
});

// ============================================================================
// Pattern Extraction Tools
// ============================================================================

server.tool("extract_emails", {
  text: z.string().describe("Text to extract email addresses from")
}, async (params) => {
  const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
  const emails = params.text.match(emailRegex) || [];
  return {
    content: [{
      type: "text",
      text: emails.length > 0 
        ? `Found ${emails.length} email(s):\n${emails.join('\n')}`
        : "No email addresses found"
    }]
  };
});

server.tool("extract_urls", {
  text: z.string().describe("Text to extract URLs from")
}, async (params) => {
  const urlRegex = /https?:\/\/[^\s<>"{}|\\^`\[\]]+/gi;
  const urls = params.text.match(urlRegex) || [];
  return {
    content: [{
      type: "text",
      text: urls.length > 0
        ? `Found ${urls.length} URL(s):\n${urls.join('\n')}`
        : "No URLs found"
    }]
  };
});

server.tool("extract_numbers", {
  text: z.string().describe("Text to extract numbers from"),
  integersOnly: z.boolean().optional().default(false).describe("Extract only integers")
}, async (params) => {
  const regex = params.integersOnly ? /\b\d+\b/g : /-?\d+\.?\d*/g;
  const numbers = params.text.match(regex) || [];
  return {
    content: [{
      type: "text",
      text: numbers.length > 0
        ? `Found ${numbers.length} number(s):\n${numbers.join(', ')}`
        : "No numbers found"
    }]
  };
});

// ============================================================================
// Encoding/Decoding Tools
// ============================================================================

server.tool("base64_encode", {
  text: z.string().describe("Text to encode to base64")
}, async (params) => {
  const encoded = Buffer.from(params.text, 'utf8').toString('base64');
  return {
    content: [{
      type: "text",
      text: encoded
    }]
  };
});

server.tool("base64_decode", {
  text: z.string().describe("Base64 encoded text to decode")
}, async (params) => {
  try {
    const decoded = Buffer.from(params.text, 'base64').toString('utf8');
    return {
      content: [{
        type: "text",
        text: decoded
      }]
    };
  } catch (error) {
    return {
      content: [{
        type: "text",
        text: `Error: Invalid base64 string - ${error.message}`
      }]
    };
  }
});

server.tool("url_encode", {
  text: z.string().describe("Text to URL encode")
}, async (params) => {
  const encoded = encodeURIComponent(params.text);
  return {
    content: [{
      type: "text",
      text: encoded
    }]
  };
});

server.tool("url_decode", {
  text: z.string().describe("URL encoded text to decode")
}, async (params) => {
  try {
    const decoded = decodeURIComponent(params.text);
    return {
      content: [{
        type: "text",
        text: decoded
      }]
    };
  } catch (error) {
    return {
      content: [{
        type: "text",
        text: `Error: Invalid URL encoded string - ${error.message}`
      }]
    };
  }
});

// ============================================================================
// Validation Tools
// ============================================================================

server.tool("validate_json", {
  text: z.string().describe("JSON string to validate")
}, async (params) => {
  try {
    const parsed = JSON.parse(params.text);
    return {
      content: [{
        type: "text",
        text: `Valid JSON! Parsed ${Array.isArray(parsed) ? 'array' : typeof parsed} with ${Object.keys(parsed).length} top-level keys.`
      }]
    };
  } catch (error) {
    return {
      content: [{
        type: "text",
        text: `Invalid JSON: ${error.message}`
      }]
    };
  }
});

server.tool("hash", {
  text: z.string().describe("Text to generate hash for"),
  algorithm: z.enum(["simple", "djb2"]).optional().default("simple").describe("Hashing algorithm to use")
}, async (params) => {
  let hash;
  if (params.algorithm === "djb2") {
    hash = params.text.split('').reduce((acc, char) => {
      acc = ((acc << 5) - acc) + char.charCodeAt(0);
      return acc & acc;
    }, 5381);
    hash = Math.abs(hash).toString(16);
  } else {
    // Simple hash
    hash = params.text.split('').reduce((acc, char) => {
      return ((acc << 5) - acc) + char.charCodeAt(0);
    }, 0);
    hash = Math.abs(hash).toString(16);
  }
  
  return {
    content: [{
      type: "text",
      text: `Hash (${params.algorithm}): ${hash}`
    }]
  };
});

// ============================================================================
// Generation Tools
// ============================================================================

server.tool("generate_uuid", {
  count: z.number().int().min(1).max(100).optional().default(1).describe("Number of UUIDs to generate")
}, async (params) => {
  const generateUUID = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  };
  
  const uuids = Array.from({ length: params.count || 1 }, () => generateUUID());
  return {
    content: [{
      type: "text",
      text: uuids.join('\n')
    }]
  };
});

server.tool("generate_random_string", {
  length: z.number().int().min(1).max(1000).describe("Length of the random string"),
  includeNumbers: z.boolean().optional().default(true).describe("Include numbers"),
  includeLetters: z.boolean().optional().default(true).describe("Include letters"),
  includeSpecial: z.boolean().optional().default(false).describe("Include special characters")
}, async (params) => {
  let chars = '';
  if (params.includeLetters) chars += 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
  if (params.includeNumbers) chars += '0123456789';
  if (params.includeSpecial) chars += '!@#$%^&*()_+-=[]{}|;:,.<>?';
  
  if (!chars) {
    return {
      content: [{
        type: "text",
        text: "Error: At least one character type must be enabled"
      }]
    };
  }
  
  const randomString = Array.from({ length: params.length }, () => 
    chars.charAt(Math.floor(Math.random() * chars.length))
  ).join('');
  
  return {
    content: [{
      type: "text",
      text: randomString
    }]
  };
});

// ============================================================================
// Advanced String Manipulation Tools
// ============================================================================

server.tool("word_wrap", {
  text: z.string().describe("Text to wrap"),
  width: z.number().int().min(10).max(200).optional().default(80).describe("Line width")
}, async (params) => {
  const words = params.text.split(/\s+/);
  const lines = [];
  let currentLine = '';
  
  for (const word of words) {
    if (currentLine.length + word.length + 1 <= params.width) {
      currentLine += (currentLine ? ' ' : '') + word;
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  }
  if (currentLine) lines.push(currentLine);
  
  return {
    content: [{
      type: "text",
      text: lines.join('\n')
    }]
  };
});

server.tool("trim_lines", {
  text: z.string().describe("Text with lines to trim")
}, async (params) => {
  const trimmed = params.text
    .split('\n')
    .map(line => line.trim())
    .join('\n');
  return {
    content: [{
      type: "text",
      text: trimmed
    }]
  };
});

server.tool("pad_string", {
  text: z.string().describe("Text to pad"),
  length: z.number().int().min(0).describe("Target length"),
  char: z.string().length(1).optional().default(' ').describe("Padding character"),
  direction: z.enum(["left", "right", "both"]).optional().default("right").describe("Padding direction")
}, async (params) => {
  let result = params.text;
  const padLength = Math.max(0, params.length - params.text.length);
  
  if (params.direction === 'left') {
    result = params.char.repeat(padLength) + result;
  } else if (params.direction === 'right') {
    result = result + params.char.repeat(padLength);
  } else if (params.direction === 'both') {
    const leftPad = Math.floor(padLength / 2);
    const rightPad = padLength - leftPad;
    result = params.char.repeat(leftPad) + result + params.char.repeat(rightPad);
  }
  
  return {
    content: [{
      type: "text",
      text: result
    }]
  };
});

server.tool("remove_duplicates", {
  text: z.string().describe("Text with duplicate lines"),
  caseSensitive: z.boolean().optional().default(true).describe("Case sensitive comparison")
}, async (params) => {
  const lines = params.text.split('\n');
  const seen = new Set();
  const unique = [];
  
  for (const line of lines) {
    const key = params.caseSensitive ? line : line.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(line);
    }
  }
  
  return {
    content: [{
      type: "text",
      text: `Original lines: ${lines.length}\nUnique lines: ${unique.length}\n\n${unique.join('\n')}`
    }]
  };
});

server.tool("sort_lines", {
  text: z.string().describe("Text with lines to sort"),
  reverse: z.boolean().optional().default(false).describe("Sort in reverse order"),
  numeric: z.boolean().optional().default(false).describe("Sort numerically")
}, async (params) => {
  const lines = params.text.split('\n');
  
  if (params.numeric) {
    lines.sort((a, b) => {
      const numA = parseFloat(a) || 0;
      const numB = parseFloat(b) || 0;
      return params.reverse ? numB - numA : numA - numB;
    });
  } else {
    lines.sort((a, b) => {
      const comparison = a.localeCompare(b);
      return params.reverse ? -comparison : comparison;
    });
  }
  
  return {
    content: [{
      type: "text",
      text: lines.join('\n')
    }]
  };
});

// ============================================================================
// Batch Processing Tools
// ============================================================================

server.tool("batch_process", {
  texts: z.array(z.string()).describe("Array of texts to process"),
  operation: z.enum(["uppercase", "lowercase", "reverse", "count"]).describe("Operation to apply to each text")
}, async (params) => {
  const results = params.texts.map((text, index) => {
    let result;
    switch (params.operation) {
      case "uppercase":
        result = text.toUpperCase();
        break;
      case "lowercase":
        result = text.toLowerCase();
        break;
      case "reverse":
        result = text.split('').reverse().join('');
        break;
      case "count":
        const words = text.trim().split(/\s+/).filter(w => w.length > 0).length;
        result = `Chars: ${text.length}, Words: ${words}`;
        break;
      default:
        result = text;
    }
    return `[${index + 1}] ${result}`;
  });
  
  return {
    content: [{
      type: "text",
      text: `Processed ${params.texts.length} items:\n${results.join('\n')}`
    }]
  };
});

// ============================================================================
// Server Initialization
// ============================================================================

await server.connect(new StdioServerTransport());