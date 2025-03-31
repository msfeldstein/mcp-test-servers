#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { exec, spawn } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const server = new McpServer(
  {
    name: "shell-exec-server",
    version: "1.0.0",
    capabilities: {
      tools: {
        executeCommand: {
          description: "Execute a shell command and return its output",
          parameters: {
            type: "object",
            properties: {
              command: {
                type: "string",
                description: "Command to execute"
              },
              timeout: {
                type: "integer",
                description: "Timeout in milliseconds",
                default: 30000
              }
            },
            required: ["command"]
          },
          async handler(params) {
            try {
              // Basic security check - prevent dangerous commands
              const dangerousCommands = ['rm -rf', 'mkfs', 'dd', '> /dev/'];
              if (dangerousCommands.some(cmd => params.command.includes(cmd))) {
                throw new Error('Command contains potentially dangerous operations');
              }

              const { stdout, stderr } = await execAsync(params.command, {
                timeout: params.timeout,
                maxBuffer: 1024 * 1024 // 1MB buffer
              });

              return {
                stdout,
                stderr,
                success: true
              };
            } catch (error) {
              if (error.signal === 'SIGTERM') {
                throw new Error('Command timed out');
              }
              throw new Error(`Command execution failed: ${error.message}`);
            }
          }
        },
        executeInteractiveCommand: {
          description: "Execute an interactive command with real-time output",
          parameters: {
            type: "object",
            properties: {
              command: {
                type: "string",
                description: "Command to execute"
              },
              args: {
                type: "array",
                items: {
                  type: "string"
                },
                description: "Command arguments"
              }
            },
            required: ["command"]
          },
          async handler(params) {
            return new Promise((resolve, reject) => {
              try {
                const child = spawn(params.command, params.args || []);
                let output = '';

                child.stdout.on('data', (data) => {
                  output += data.toString();
                });

                child.stderr.on('data', (data) => {
                  output += data.toString();
                });

                child.on('close', (code) => {
                  resolve({
                    output,
                    exitCode: code,
                    success: code === 0
                  });
                });

                child.on('error', (error) => {
                  reject(new Error(`Failed to start command: ${error.message}`));
                });
              } catch (error) {
                reject(new Error(`Failed to execute command: ${error.message}`));
              }
            });
          }
        }
      }
    }
  }
);

await server.connect(new StdioServerTransport()); 