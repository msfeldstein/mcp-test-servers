#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { SONIC_IMAGE_BASE64 } from "./sample-image.js";

// Create a new MCP server with comprehensive capabilities
const server = new McpServer(
  {
    name: "everything-server",
    version: "1.0.0",
    capabilities: {
      tools: {},
      resources: {},
      prompts: {}
    }
  }
);

// Dynamic tool state
let dynamicToolEnabled = false;

// ===== TOOLS =====

// 1. Tool call with parameters
server.tool("echo_with_params", {
  message: z.string().describe("The message to echo back"),
  repeat_count: z.number().optional().default(1).describe("How many times to repeat the message"),
  uppercase: z.boolean().optional().default(false).describe("Whether to convert to uppercase")
}, async (params) => {
  let result = params.message;
  if (params.uppercase) {
    result = result.toUpperCase();
  }
  
  const repeated = Array(params.repeat_count).fill(result).join(" ");
  
  return {
    content: [{
      type: "text",
      text: `Echoed: ${repeated}`
    }]
  };
});

// 2. Tool call without parameters
server.tool("simple_ping", "A simple tool that returns 'pong' without any parameters", async () => {
  return {
    content: [{
      type: "text",
      text: "pong"
    }]
  };
});

// 3. Tool call that returns a text resource and an image resource
server.tool("get_mixed_resources", "Returns both text and image content", async () => {
  return {
    content: [
      {
        type: "text",
        text: "Here is some text content along with an image:"
      },
      {
        type: "image",
        data: SONIC_IMAGE_BASE64,
        mimeType: "image/jpeg",
      },
      {
        type: "text", 
        text: "This demonstrates returning mixed content types from a single tool call."
      }
    ]
  };
});

// 4. Tool call that asks for each elicitation format type
server.tool("test_all_elicitations", "Tests all different elicitation input types", async () => {
  // String input
  const nameResult = await server.server.elicitInput({
    message: "What is your name?",
    requestedSchema: {
      type: "object",
      properties: {
        name: {
          type: "string",
          title: "Your Name",
          description: "Please enter your full name"
        }
      },
      required: ["name"]
    }
  });

  if (nameResult.action !== "accept" || !nameResult.content?.name) {
    return {
      content: [{
        type: "text",
        text: "Name input was cancelled or not provided."
      }]
    };
  }

  // Boolean input
  const boolResult = await server.server.elicitInput({
    message: "Do you like programming?",
    requestedSchema: {
      type: "object",
      properties: {
        likes_programming: {
          type: "boolean",
          title: "Programming Preference",
          description: "Select yes if you enjoy programming"
        }
      },
      required: ["likes_programming"]
    }
  });

  if (boolResult.action !== "accept" || boolResult.content?.likes_programming === undefined) {
    return {
      content: [{
        type: "text",
        text: `Hello ${nameResult.content.name}! Boolean input was cancelled.`
      }]
    };
  }

  // Number input
  const numberResult = await server.server.elicitInput({
    message: "How many years of experience do you have?",
    requestedSchema: {
      type: "object",
      properties: {
        years_experience: {
          type: "number",
          title: "Years of Experience",
          description: "Enter the number of years",
          minimum: 0,
          maximum: 50
        }
      },
      required: ["years_experience"]
    }
  });

  if (numberResult.action !== "accept" || numberResult.content?.years_experience === undefined) {
    return {
      content: [{
        type: "text",
        text: `Hello ${nameResult.content.name}! Number input was cancelled.`
      }]
    };
  }

  // Enum input
  const enumResult = await server.server.elicitInput({
    message: "What is your favorite programming language?",
    requestedSchema: {
      type: "object",
      properties: {
        language: {
          type: "string",
          title: "Programming Language",
          description: "Select your favorite language",
          enum: ["javascript", "python", "rust", "go", "java"],
          enumNames: ["JavaScript", "Python", "Rust", "Go", "Java"]
        }
      },
      required: ["language"]
    }
  });

  if (enumResult.action !== "accept" || !enumResult.content?.language) {
    return {
      content: [{
        type: "text",
        text: `Hello ${nameResult.content.name}! Enum input was cancelled.`
      }]
    };
  }

  return {
    content: [{
      type: "text",
      text: `Elicitation Results:
- Name: ${nameResult.content.name}
- Likes Programming: ${boolResult.content.likes_programming ? "Yes" : "No"}
- Years Experience: ${numberResult.content.years_experience}
- Favorite Language: ${enumResult.content.language}

All elicitation types (string, boolean, number, enum) were successfully tested!`
    }]
  };
});

// 5. Tool call that dynamically enables a second tool that wasn't enabled before (and disables if it is)
const dynamicTool = server.tool("dynamic_feature", {
  action: z.string().optional().describe("Optional action to perform with the dynamic feature")
}, async (params) => {
  const action = params?.action || "default";
  return {
    content: [{
      type: "text",
      text: `Dynamic tool is now active! Performed action: ${action}. This tool was dynamically enabled by the toggle_dynamic_tool.`
    }]
  };
});

// Initially disable the dynamic tool
dynamicTool.disable();

server.tool("toggle_dynamic_tool", "Toggles the availability of the dynamic_feature tool", async () => {
  if (dynamicToolEnabled) {
    dynamicTool.disable();
    dynamicToolEnabled = false;
    return {
      content: [{
        type: "text",
        text: "Dynamic tool has been DISABLED. The 'dynamic_feature' tool is no longer available."
      }]
    };
  } else {
    dynamicTool.enable();
    dynamicToolEnabled = true;
    return {
      content: [{
        type: "text",
        text: "Dynamic tool has been ENABLED. The 'dynamic_feature' tool is now available for use!"
      }]
    };
  }
});

// 6. Tool that echoes out the mcp roots
server.tool("echo_mcp_roots", "Echoes back the MCP roots provided by the client", async () => {
  try {
    const roots = await server.server.listRoots();
    return {
      content: [{
        type: "text",
        text: `MCP Roots:\n${JSON.stringify(roots, null, 2)}`
      }]
    };
  } catch (error) {
    return {
      content: [{
        type: "text",
        text: `Error retrieving MCP roots: ${error.message}`
      }]
    };
  }
});

// 7. Tool that echoes the env var "MY_ENV_VAR"
server.tool("echo_env_var", "Echoes the MY_ENV_VAR environment variable", async () => {
  const envValue = process.env.MY_ENV_VAR;
  return {
    content: [{
      type: "text",
      text: envValue ? `MY_ENV_VAR = ${envValue}` : "MY_ENV_VAR is not set or is empty"
    }]
  };
});

// 8. Long-running progress tool that updates every 2 seconds for 20 seconds
server.tool("long_running_progress", {
  task_name: z.string().optional().default("MCP Test Task").describe("Name of the task to run")
}, async (params) => {
  const taskName = params?.task_name || "MCP Test Task";
  const totalDuration = 20; // 20 seconds
  const updateInterval = 2; // 2 seconds
  const totalSteps = totalDuration / updateInterval; // 10 steps
  
  const stepMessages = [
    "🚀 Initializing task...",
    "📊 Loading data...",
    "🔍 Processing information...",
    "⚡ Analyzing results...",
    "🧮 Performing calculations...",
    "📝 Generating output...",
    "🎯 Optimizing results...",
    "✅ Finalizing...",
    "🎉 Almost done...",
    "✨ Task completed!"
  ];

  for (let i = 0; i <= totalSteps; i++) {
    const message = stepMessages[Math.min(i, stepMessages.length - 1)];
    
    // Send progress notification if supported
    try {
      await server.sendProgress(i, totalSteps, `${taskName}: ${message}`);
    } catch (error) {
      // Progress notifications not supported, continue silently
    }
    
    // Don't wait after the last step
    if (i < totalSteps) {
      await new Promise((resolve) => setTimeout(resolve, updateInterval * 1000));
    }
  }

  return {
    content: [{
      type: "text",
      text: `Long-running task "${taskName}" completed successfully! Ran for ${totalDuration} seconds with progress updates every ${updateInterval} seconds.`
    }]
  };
});

// ===== RESOURCES =====

// Publishes a text resource
server.resource(
  "Everything Server Documentation",
  "everything://docs.txt",
  {
    description: "Comprehensive documentation for the everything server",
    mimeType: "text/plain"
  },
  async () => ({
    contents: [
      {
        uri: "everything://docs.txt",
        mimeType: "text/plain",
        text: `Everything Server Documentation

This server demonstrates all MCP features:

TOOLS:
- echo_with_params: Tool with multiple parameter types
- simple_ping: Tool without parameters  
- get_mixed_resources: Returns both text and image content
- test_all_elicitations: Tests string, boolean, number, and enum elicitation
- toggle_dynamic_tool: Enables/disables the dynamic_feature tool
- dynamic_feature: A tool that can be dynamically enabled/disabled
- echo_mcp_roots: Shows MCP roots from the client
- echo_env_var: Shows the MY_ENV_VAR environment variable
- long_running_progress: Long-running task with progress updates every 2 seconds for 20 seconds

RESOURCES:
- everything://docs.txt: This documentation (text)
- everything://test-image.png: A test image (image)

PROMPTS:
- simple-greeting: A prompt with no parameters
- personalized-message: A prompt with 2 parameters (name and topic)
- test-everything: Comprehensive testing instructions for AI agents

This server is designed to test every aspect of the MCP protocol.`
      }
    ]
  })
);

// Publishes an image resource
server.resource(
  "Test Image",
  "everything://test-image.png",
  {
    description: "A simple test image for demonstration purposes",
    mimeType: "image/png"
  },
  async () => ({
    contents: [
      {
        uri: "everything://test-image.png",
        mimeType: "image/png",
        text: TEST_IMAGE_BASE64
      }
    ]
  })
);

// ===== PROMPTS =====

// Add prompt with no parameters
server.prompt("simple-greeting", "A simple greeting prompt with no parameters", async () => {
  return {
    description: "A simple greeting",
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
          text: "Hello! Welcome to the Everything Server. This server demonstrates all MCP features including tools, resources, prompts, and elicitation. How can I help you test the MCP protocol today?"
        }
      }
    ]
  };
});

// Add prompt with 2 parameters
server.prompt("personalized-message", "Generate a personalized message with name and topic parameters", {
  name: z.string().describe("The person's name"),
  topic: z.string().describe("The topic to discuss")
}, async (params) => {
  const name = params?.name || "Friend";
  const topic = params?.topic || "MCP";
  
  return {
    description: "A personalized message",
    messages: [
      {
        role: "user",
        content: {
          type: "text",
          text: `Create a personalized message for ${name} about ${topic}`
        }
      },
      {
        role: "assistant",
        content: {
          type: "text",
          text: `Hello ${name}! I hope you're having a wonderful day. I wanted to share some thoughts about ${topic} with you. The Model Context Protocol (MCP) is a fascinating technology that enables seamless communication between AI assistants and various tools and resources. It's exciting to see how ${topic} can enhance our interactions and make them more productive. Thank you for exploring this with me, ${name}!`
        }
      }
    ]
  };
});

// Add comprehensive testing prompt for AI agents
server.prompt("test-everything", "Comprehensive testing instructions for AI agents to systematically test all MCP features", async () => {
  return {
    description: "Complete MCP testing instructions for AI agents",
    messages: [
      {
        role: "user",
        content: {
          type: "text",
          text: `You are an AI agent tasked with comprehensively testing the Everything MCP Server. This server implements ALL MCP features for testing purposes. Please systematically test each feature following this exact sequence:

## TOOL TESTING PHASE

### Basic Tools
3. Call 'simple_ping' (no parameters) - should return "pong"
4. Call 'echo_with_params' with:
   - message: "Hello MCP World"
   - repeat_count: 3
   - uppercase: true
   Expected: "HELLO MCP WORLD HELLO MCP WORLD HELLO MCP WORLD"

### Mixed Content Tool
5. Call 'get_mixed_resources' - should return both text and an image

### Elicitation Testing
6. Call 'test_all_elicitations' and respond to ALL prompts:
   - Enter your name (string input)
   - Answer if you like programming (boolean)
   - Enter years of experience 0-50 (number)
   - Select a programming language (enum)
   Complete all steps to get the summary

### Dynamic Tool Management
7. Call 'toggle_dynamic_tool' - should enable the dynamic_feature tool
8. Verify 'dynamic_feature' tool is now available
9. Call 'dynamic_feature' with action: "test_action"
10. Call 'toggle_dynamic_tool' again - should disable the dynamic_feature tool
11. Verify 'dynamic_feature' tool is no longer available

### System Information Tools
12. Call 'echo_mcp_roots' - should show MCP roots JSON
13. Call 'echo_env_var' - should show "MY_ENV_VAR = My Special Token"

### Long-Running Task
14. Call 'long_running_progress' with task_name: "MCP Comprehensive Test"
    - Should run for 20 seconds with progress updates every 2 seconds
    - Watch for progress notifications if your client supports them

## RESOURCE TESTING PHASE
15. Fetch resource 'everything://docs.txt' - should return comprehensive documentation
16. Fetch resource 'everything://test-image.png' - should return a test image

## PROMPT TESTING PHASE
17. Use prompt 'simple-greeting' (no parameters) - should return friendly greeting
18. Use prompt 'personalized-message' with:
    - name: "AI Tester"
    - topic: "MCP Protocol Validation"

## VALIDATION PHASE
19. Confirm all tests passed and document any failures
20. Provide a summary of which MCP features are working correctly

## SUCCESS CRITERIA
- All tools execute without errors
- Elicitation collects all 4 input types successfully
- Dynamic tool can be toggled on/off
- Resources return expected content types
- Prompts generate appropriate responses
- Environment variable is correctly echoed
- Progress notifications work (if supported by client)

Execute each step methodically and report the results. This comprehensive test validates that all MCP protocol features are functioning correctly.`
        }
      }
    ]
  };
});

// Connect to the transport and start the server
await server.connect(new StdioServerTransport());

// This server implements ALL MCP features for comprehensive testing
