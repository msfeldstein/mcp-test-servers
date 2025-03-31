#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import fs from 'fs/promises';
import path from 'path';

const server = new McpServer(
  {
    name: "file-ops-server",
    version: "1.0.0",
    capabilities: {
      tools: {
        readFile: {
          description: "Read contents of a file",
          parameters: {
            type: "object",
            properties: {
              filePath: {
                type: "string",
                description: "Path to the file to read"
              }
            },
            required: ["filePath"]
          },
          async handler(params) {
            try {
              const content = await fs.readFile(params.filePath, 'utf-8');
              return { content };
            } catch (error) {
              throw new Error(`Failed to read file: ${error.message}`);
            }
          }
        },
        writeFile: {
          description: "Write content to a file",
          parameters: {
            type: "object",
            properties: {
              filePath: {
                type: "string",
                description: "Path to write the file to"
              },
              content: {
                type: "string",
                description: "Content to write to the file"
              }
            },
            required: ["filePath", "content"]
          },
          async handler(params) {
            try {
              await fs.writeFile(params.filePath, params.content, 'utf-8');
              return { success: true };
            } catch (error) {
              throw new Error(`Failed to write file: ${error.message}`);
            }
          }
        },
        listDirectory: {
          description: "List contents of a directory",
          parameters: {
            type: "object",
            properties: {
              dirPath: {
                type: "string",
                description: "Path to the directory to list"
              }
            },
            required: ["dirPath"]
          },
          async handler(params) {
            try {
              const files = await fs.readdir(params.dirPath);
              const fileStats = await Promise.all(
                files.map(async (file) => {
                  const filePath = path.join(params.dirPath, file);
                  const stats = await fs.stat(filePath);
                  return {
                    name: file,
                    isDirectory: stats.isDirectory(),
                    size: stats.size,
                    modified: stats.mtime
                  };
                })
              );
              return { files: fileStats };
            } catch (error) {
              throw new Error(`Failed to list directory: ${error.message}`);
            }
          }
        }
      }
    }
  }
);

await server.connect(new StdioServerTransport()); 