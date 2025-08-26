#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

const server = new Server(
  {
    name: "example-servers/long-running",
    version: "1.2.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

const LongRunningOperationSchema = z.object({
  duration: z
    .number()
    .min(1)
    .max(600)
    .default(15)
    .describe("Duration of the operation in seconds (1-600)"),
  steps: z.number().min(1).max(50).default(8).describe("Number of steps in the operation (1-50)"),
});

const LongRunningOperationWithNoTotalSchema = z.object({
  duration: z
    .number()
    .min(1)
    .max(600)
    .default(15)
    .describe("Duration of the operation in seconds (1-600)"),
  steps: z.number().min(1).max(50).default(8).describe("Number of steps in the operation (1-50)"),
});


const LongRunningOperationJSONSchema = {
  "type": "object",
  "properties": {
    "duration": {
      "type": "number",
      "description": "Duration of the operation in seconds (1-600)",
      "default": 15
    },
    "steps": {
      "type": "number",
      "description": "Number of steps in the operation (1-50)",
      "default": 8
    }
  },
  "required": []
}

const LongRunningOperationWithNoTotalJSONSchema = {
  "type": "object",
  "properties": {
    "duration": {
      "type": "number",
      "description": "Duration of the operation in seconds (1-600)",
      "default": 15
    },
    "steps": {
      "type": "number",
      "description": "Number of steps in the operation (1-50)",
      "default": 8
    }
  },
  "required": []
}

const LongRunningOperationWithMessageJSONSchema = {
  "type": "object",
  "properties": {
    "duration": {
      "type": "number",
      "description": "Duration of the operation in seconds (1-600)",
      "default": 15
    },
    "steps": {
      "type": "number",
      "description": "Number of steps in the operation (1-50)",
      "default": 8
    }
  },
  "required": []
}

server.setRequestHandler(ListToolsRequestSchema, async () => {
  const tools = [
    {
      name: "long-running-task",
      description:
        "Executes a long-running task with real-time progress tracking",
      inputSchema: LongRunningOperationJSONSchema
    },
    {
      name: "long-running-task-with-no-total",
      description:
        "Executes a long-running task with real-time progress tracking",
      inputSchema: LongRunningOperationWithNoTotalJSONSchema
    },
    {
      name: "long-running-task-with-message",
      description:
        "Demonstrates a long running operation with progress updates and messages",
      inputSchema: LongRunningOperationWithMessageJSONSchema
    }
  ];

  return { tools };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (name === "long-running-task") {
    const validatedArgs = LongRunningOperationSchema.parse(args);
    const { duration, steps } = validatedArgs;
    const stepDuration = duration / steps;
    const progressToken = request.params._meta?.progressToken;

    for (let i = 0; i < steps + 1; i++) {
      if (progressToken !== undefined) {
        await server.notification({
          method: "notifications/progress",
          params: {
            progress: i,
            total: steps,
            progressToken,
          },
        });
      }
      await new Promise((resolve) =>
        setTimeout(resolve, stepDuration * 1000)
      );
    }

    return {
      content: [
        {
          type: "text",
          text: `Long running operation completed. Duration: ${duration} seconds, Steps: ${steps}.`,
        },
      ],
    };
  }

  if (name === "long-running-task-with-no-total") {
    const validatedArgs = LongRunningOperationWithNoTotalSchema.parse(args);
    const { duration, steps } = validatedArgs;
    const stepDuration = duration / steps;
    const progressToken = request.params._meta?.progressToken;

    for (let i = 0; i < steps + 1; i++) {
      if (progressToken !== undefined) {
        await server.notification({
          method: "notifications/progress",
          params: {
            progress: i,
            progressToken,
          },
        });
      }
      await new Promise((resolve) =>
        setTimeout(resolve, stepDuration * 1000)
      );
    }

    return {
      content: [
        {
          type: "text",
          text: `Long running operation completed. Duration: ${duration} seconds, Steps: ${steps}.`,
        },
      ],
    };
  }

  if (name === "long-running-task-with-message") {
    const validatedArgs = LongRunningOperationSchema.parse(args);
    const { duration, steps } = validatedArgs;
    const stepDuration = duration / steps;
    const progressToken = request.params._meta?.progressToken;

    const stepMessages = [
      "🚀 Initializing operation...",
      "📊 Processing data...",
      "🔍 Analyzing results...",
      "⚡ Optimizing performance...",
      "📝 Generating reports...",
      "🎯 Finalizing output...",
      "✅ Operation complete!"
    ];

    for (let i = 0; i < steps + 1; i++) {
      if (progressToken !== undefined) {
        const message = stepMessages[Math.min(i, stepMessages.length - 1)];
        await server.notification({
          method: "notifications/progress",
          params: {
            progress: i,
            total: steps,
            message,
            progressToken,
          },
        });
      }
      await new Promise((resolve) =>
        setTimeout(resolve, stepDuration * 1000)
      );
    }

    return {
      content: [
        {
          type: "text",
          text: `Long running operation with messages completed. Duration: ${duration} seconds, Steps: ${steps}.`,
        },
      ],
    };
  }
});

// Connect to the transport and start the server
await server.connect(new StdioServerTransport());

// This server implements a long-running task with progress notifications 