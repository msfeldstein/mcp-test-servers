#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { SONIC_IMAGE_BASE64 } from "./sample-image";

// Create a new MCP server with stdio transport
const server = new McpServer({
  name: "image-server",
  version: "1.0.0",
});
 
// Register the generate_image tool
server.tool("generate_image", "A tool that returns an image of Sonic the Hedgehog", async (params) => {
  return {
    content: [
      {
        type: "image",
        data: SONIC_IMAGE_BASE64,
        mimeType: "image/jpeg",
      },
    ],
  };
});

// Register the Sonic image as a resource
server.resource(
  "Sonic the Hedgehog Image",
  "sonic://image.jpeg",
  {
    description: "An image of Sonic the Hedgehog",
    mimeType: "image/jpeg"
  },
  async () => ({
    contents: [
      {
        uri: "sonic://image.jpeg",
        mimeType: "image/jpeg",
        text: SONIC_IMAGE_BASE64,
      },
    ],
  })
);

// Register a text resource about Sonic
server.resource(
  "Sonic the Hedgehog Info",
  "sonic://info.txt",
  {
    description: "Information about Sonic the Hedgehog character",
    mimeType: "text/plain"
  },
  async () => ({
    contents: [
      {
        uri: "sonic://info.txt",
        mimeType: "text/plain",
        text: "Sonic the Hedgehog is a blue anthropomorphic hedgehog who is the main protagonist of the video game series published by Sega. Known for his super speed, Sonic can run faster than the speed of sound. He was created by artist Naoto Ohshima and programmer Yuji Naka. Sonic first appeared in the 1991 video game Sonic the Hedgehog for the Sega Genesis console. His signature ability is the Spin Dash, which lets him roll into a ball and dash at enemies and obstacles. Sonic's nemesis is Dr. Eggman (originally known as Dr. Robotnik), a mad scientist who wants to conquer the world.",
      },
    ],
  })
);

// Connect to the transport and start the server
await server.connect(new StdioServerTransport());
