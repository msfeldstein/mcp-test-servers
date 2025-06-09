#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

const server = new Server(
  {
    name: "example-servers/everything",
    version: "1.0.0",
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
    .default(10)
    .describe("Duration of the operation in seconds"),
  steps: z.number().default(5).describe("Number of steps in the operation"),
});

const LongRunningOperationWithNoTotalSchema = z.object({
  duration: z
    .number()
    .default(10)
    .describe("Duration of the operation in seconds"),
  steps: z.number().default(5).describe("Number of steps in the operation"),
});


const LongRunningOperationJSONSchema = {
  "type": "object",
  "properties": {
    "duration": {
      "type": "number",
      "description": "Duration of the operation in seconds",
      "default": 10
    },
    "steps": {
      "type": "number",
      "description": "Number of steps in the operation",
      "default": 5
    }
  },
  "required": []
}

const LongRunningOperationWithNoTotalJSONSchema = {
  "type": "object",
  "properties": {
    "duration": {
      "type": "number",
      "description": "Duration of the operation in seconds",
      "default": 10
    },
    "steps": {
      "type": "number",
      "description": "Number of steps in the operation",
      "default": 5
    }
  },
  "required": []
}

server.setRequestHandler(ListToolsRequestSchema, async () => {
  const tools = [
    {
      name: "long-running-task",
      description:
        "Demonstrates a long running operation with progress updates",
      inputSchema: LongRunningOperationJSONSchema
    },
    {
      name: "long-running-task-with-no-total",
      description:
        "Demonstrates a long running operation with progress updates",
      inputSchema: LongRunningOperationWithNoTotalJSONSchema
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
});

// Connect to the transport and start the server
await server.connect(new StdioServerTransport());

// This server implements a long-running task with progress notifications 