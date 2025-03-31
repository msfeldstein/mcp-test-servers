#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

const server = new McpServer(
  {
    name: "math-ops-server",
    version: "1.0.0",
    capabilities: {
      tools: {
        calculateStatistics: {
          description: "Calculate statistical measures for a dataset",
          parameters: {
            type: "object",
            properties: {
              numbers: {
                type: "array",
                items: {
                  type: "number"
                },
                description: "Array of numbers to analyze"
              }
            },
            required: ["numbers"]
          },
          handler(params) {
            const numbers = params.numbers;
            if (numbers.length === 0) {
              throw new Error("Dataset cannot be empty");
            }

            // Calculate mean
            const sum = numbers.reduce((a, b) => a + b, 0);
            const mean = sum / numbers.length;

            // Calculate median
            const sorted = [...numbers].sort((a, b) => a - b);
            const median = numbers.length % 2 === 0
              ? (sorted[numbers.length / 2 - 1] + sorted[numbers.length / 2]) / 2
              : sorted[Math.floor(numbers.length / 2)];

            // Calculate standard deviation
            const squareDiffs = numbers.map(value => Math.pow(value - mean, 2));
            const avgSquareDiff = squareDiffs.reduce((a, b) => a + b, 0) / numbers.length;
            const stdDev = Math.sqrt(avgSquareDiff);

            return {
              mean,
              median,
              stdDev,
              min: Math.min(...numbers),
              max: Math.max(...numbers),
              count: numbers.length
            };
          }
        },
        solveQuadratic: {
          description: "Solve quadratic equation ax² + bx + c = 0",
          parameters: {
            type: "object",
            properties: {
              a: {
                type: "number",
                description: "Coefficient of x²"
              },
              b: {
                type: "number",
                description: "Coefficient of x"
              },
              c: {
                type: "number",
                description: "Constant term"
              }
            },
            required: ["a", "b", "c"]
          },
          handler(params) {
            const { a, b, c } = params;
            if (a === 0) {
              throw new Error("Coefficient 'a' cannot be zero - equation is not quadratic");
            }

            const discriminant = b * b - 4 * a * c;
            
            if (discriminant < 0) {
              const realPart = -b / (2 * a);
              const imagPart = Math.sqrt(Math.abs(discriminant)) / (2 * a);
              return {
                type: "complex",
                roots: [
                  { real: realPart, imaginary: imagPart },
                  { real: realPart, imaginary: -imagPart }
                ]
              };
            }

            const root1 = (-b + Math.sqrt(discriminant)) / (2 * a);
            const root2 = (-b - Math.sqrt(discriminant)) / (2 * a);
            
            return {
              type: "real",
              roots: [root1, root2]
            };
          }
        },
        calculateMatrix: {
          description: "Perform matrix operations",
          parameters: {
            type: "object",
            properties: {
              operation: {
                type: "string",
                enum: ["add", "multiply", "determinant", "transpose"],
                description: "Matrix operation to perform"
              },
              matrix1: {
                type: "array",
                items: {
                  type: "array",
                  items: {
                    type: "number"
                  }
                },
                description: "First matrix"
              },
              matrix2: {
                type: "array",
                items: {
                  type: "array",
                  items: {
                    type: "number"
                  }
                },
                description: "Second matrix (for add/multiply operations)"
              }
            },
            required: ["operation", "matrix1"]
          },
          handler(params) {
            const { operation, matrix1, matrix2 } = params;

            switch (operation) {
              case "transpose":
                return {
                  result: matrix1[0].map((_, colIndex) =>
                    matrix1.map(row => row[colIndex]))
                };

              case "determinant":
                if (matrix1.length !== matrix1[0].length) {
                  throw new Error("Matrix must be square for determinant");
                }
                // Simple 2x2 determinant implementation
                if (matrix1.length === 2) {
                  return {
                    result: matrix1[0][0] * matrix1[1][1] - matrix1[0][1] * matrix1[1][0]
                  };
                }
                throw new Error("Only 2x2 determinants are implemented");

              case "add":
                if (!matrix2) throw new Error("Second matrix required for addition");
                if (matrix1.length !== matrix2.length ||
                    matrix1[0].length !== matrix2[0].length) {
                  throw new Error("Matrices must have same dimensions for addition");
                }
                return {
                  result: matrix1.map((row, i) =>
                    row.map((val, j) => val + matrix2[i][j]))
                };

              case "multiply":
                if (!matrix2) throw new Error("Second matrix required for multiplication");
                if (matrix1[0].length !== matrix2.length) {
                  throw new Error("Invalid dimensions for matrix multiplication");
                }
                const result = matrix1.map(row => {
                  return matrix2[0].map((_, j) => {
                    return row.reduce((sum, val, k) => {
                      return sum + val * matrix2[k][j];
                    }, 0);
                  });
                });
                return { result };

              default:
                throw new Error(`Unknown operation: ${operation}`);
            }
          }
        }
      }
    }
  }
);

await server.connect(new StdioServerTransport()); 