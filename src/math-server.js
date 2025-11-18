#!/usr/bin/env node
// Copyright Anysphere Inc.
// Advanced Mathematics Server with comprehensive operations including statistics, 
// trigonometry, logarithms, matrix operations, and numerical analysis

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

/**
 * Advanced Math Server - Professional Mathematics Suite
 * 
 * Comprehensive mathematical operations server providing:
 * - Basic arithmetic operations (add, subtract, multiply, divide, modulo)
 * - Advanced operations (power, roots, logarithms, exponentials)
 * - Trigonometric functions (sin, cos, tan, and their inverses)
 * - Statistical functions (mean, median, mode, standard deviation, variance)
 * - Matrix operations (addition, multiplication, determinant, transpose)
 * - Number theory (GCD, LCM, prime checking, factorization)
 * - Numerical analysis (derivative approximation, integration approximation)
 * - Financial calculations (compound interest, present value, future value)
 * 
 * NEW in v2.1.0:
 * - Polynomial operations (evaluate, roots, derivative)
 * - Combinatorics (permutations, combinations, binomial coefficient)
 * - Complex number operations (coming soon)
 * - Vector operations (dot product, cross product, magnitude)
 * - Enhanced statistical tools (percentile, z-score, correlation)
 */

const server = new McpServer(
  {
    name: "math-server",
    version: "2.1.0",
    capabilities: {
      tools: {}
    }
  }
);

// ============================================================================
// Basic Arithmetic Operations
// ============================================================================
// Random test edit - arithmetic section

server.tool("add", {
  a: z.number().describe("First number"),
  b: z.number().describe("Second number")
}, async (params) => {
  const result = params.a + params.b;
  return {
    content: [{
      type: "text",
      text: `${params.a} + ${params.b} = ${result}`
    }]
  };
});

server.tool("subtract", {
  a: z.number().describe("Number to subtract from"),
  b: z.number().describe("Number to subtract")
}, async (params) => {
  const result = params.a - params.b;
  return {
    content: [{
      type: "text",
      text: `${params.a} - ${params.b} = ${result}`
    }]
  };
});

server.tool("multiply", {
  a: z.number().describe("First number"),
  b: z.number().describe("Second number")
}, async (params) => {
  const result = params.a * params.b;
  return {
    content: [{
      type: "text",
      text: `${params.a} × ${params.b} = ${result}`
    }]
  };
});

server.tool("divide", {
  a: z.number().describe("Dividend"),
  b: z.number().describe("Divisor (cannot be zero)")
}, async (params) => {
  if (params.b === 0) {
    return {
      content: [{
        type: "text",
        text: "Error: Division by zero is not allowed"
      }]
    };
  }
  const result = params.a / params.b;
  return {
    content: [{
      type: "text",
      text: `${params.a} ÷ ${params.b} = ${result}`
    }]
  };
});

server.tool("modulo", {
  a: z.number().describe("Dividend"),
  b: z.number().describe("Divisor")
}, async (params) => {
  if (params.b === 0) {
    return {
      content: [{
        type: "text",
        text: "Error: Modulo by zero is not allowed"
      }]
    };
  }
  const result = params.a % params.b;
  return {
    content: [{
      type: "text",
      text: `${params.a} mod ${params.b} = ${result}`
    }]
  };
});

// ============================================================================
// Advanced Mathematical Operations
// ============================================================================

server.tool("power", {
  base: z.number().describe("Base number"),
  exponent: z.number().describe("Exponent")
}, async (params) => {
  const result = Math.pow(params.base, params.exponent);
  return {
    content: [{
      type: "text",
      text: `${params.base}^${params.exponent} = ${result}`
    }]
  };
});

server.tool("sqrt", {
  n: z.number().min(0).describe("Number to find square root of (must be non-negative)")
}, async (params) => {
  const result = Math.sqrt(params.n);
  return {
    content: [{
      type: "text",
      text: `√${params.n} = ${result}`
    }]
  };
});

server.tool("cbrt", {
  n: z.number().describe("Number to find cube root of")
}, async (params) => {
  const result = Math.cbrt(params.n);
  return {
    content: [{
      type: "text",
      text: `∛${params.n} = ${result}`
    }]
  };
});

server.tool("nth_root", {
  n: z.number().describe("Number"),
  root: z.number().int().min(2).describe("Root degree (e.g., 2 for square root, 3 for cube root)")
}, async (params) => {
  if (params.n < 0 && params.root % 2 === 0) {
    return {
      content: [{
        type: "text",
        text: "Error: Cannot calculate even root of negative number"
      }]
    };
  }
  const result = Math.pow(Math.abs(params.n), 1 / params.root);
  const finalResult = params.n < 0 ? -result : result;
  return {
    content: [{
      type: "text",
      text: `${params.root}√${params.n} = ${finalResult}`
    }]
  };
});

server.tool("log", {
  n: z.number().positive().describe("Number to calculate logarithm of"),
  base: z.number().positive().optional().default(Math.E).describe("Logarithm base (default: e)")
}, async (params) => {
  const result = Math.log(params.n) / Math.log(params.base);
  return {
    content: [{
      type: "text",
      text: `log_${params.base}(${params.n}) = ${result}`
    }]
  };
});

server.tool("ln", {
  n: z.number().positive().describe("Number to calculate natural logarithm of")
}, async (params) => {
  const result = Math.log(params.n);
  return {
    content: [{
      type: "text",
      text: `ln(${params.n}) = ${result}`
    }]
  };
});

server.tool("log10", {
  n: z.number().positive().describe("Number to calculate base-10 logarithm of")
}, async (params) => {
  const result = Math.log10(params.n);
  return {
    content: [{
      type: "text",
      text: `log₁₀(${params.n}) = ${result}`
    }]
  };
});

server.tool("exp", {
  n: z.number().describe("Exponent for e^n")
}, async (params) => {
  const result = Math.exp(params.n);
  return {
    content: [{
      type: "text",
      text: `e^${params.n} = ${result}`
    }]
  };
});

server.tool("factorial", {
  n: z.number().int().min(0).max(170).describe("Non-negative integer to calculate factorial of")
}, async (params) => {
  let result = 1;
  for (let i = 2; i <= params.n; i++) {
    result *= i;
  }
  return {
    content: [{
      type: "text",
      text: `${params.n}! = ${result}`
    }]
  };
});

// ============================================================================
// Trigonometric Functions
// ============================================================================

server.tool("sin", {
  angle: z.number().describe("Angle in radians")
}, async (params) => {
  const result = Math.sin(params.angle);
  return {
    content: [{
      type: "text",
      text: `sin(${params.angle}) = ${result}`
    }]
  };
});

server.tool("cos", {
  angle: z.number().describe("Angle in radians")
}, async (params) => {
  const result = Math.cos(params.angle);
  return {
    content: [{
      type: "text",
      text: `cos(${params.angle}) = ${result}`
    }]
  };
});

server.tool("tan", {
  angle: z.number().describe("Angle in radians")
}, async (params) => {
  const result = Math.tan(params.angle);
  return {
    content: [{
      type: "text",
      text: `tan(${params.angle}) = ${result}`
    }]
  };
});

server.tool("asin", {
  value: z.number().min(-1).max(1).describe("Value between -1 and 1")
}, async (params) => {
  const result = Math.asin(params.value);
  return {
    content: [{
      type: "text",
      text: `arcsin(${params.value}) = ${result} radians (${result * 180 / Math.PI} degrees)`
    }]
  };
});

server.tool("acos", {
  value: z.number().min(-1).max(1).describe("Value between -1 and 1")
}, async (params) => {
  const result = Math.acos(params.value);
  return {
    content: [{
      type: "text",
      text: `arccos(${params.value}) = ${result} radians (${result * 180 / Math.PI} degrees)`
    }]
  };
});

server.tool("atan", {
  value: z.number().describe("Value to calculate arctangent of")
}, async (params) => {
  const result = Math.atan(params.value);
  return {
    content: [{
      type: "text",
      text: `arctan(${params.value}) = ${result} radians (${result * 180 / Math.PI} degrees)`
    }]
  };
});

server.tool("degrees_to_radians", {
  degrees: z.number().describe("Angle in degrees")
}, async (params) => {
  const radians = params.degrees * Math.PI / 180;
  return {
    content: [{
      type: "text",
      text: `${params.degrees}° = ${radians} radians`
    }]
  };
});

server.tool("radians_to_degrees", {
  radians: z.number().describe("Angle in radians")
}, async (params) => {
  const degrees = params.radians * 180 / Math.PI;
  return {
    content: [{
      type: "text",
      text: `${params.radians} radians = ${degrees}°`
    }]
  };
});

// ============================================================================
// Statistical Functions
// ============================================================================

server.tool("mean", {
  numbers: z.array(z.number()).min(1).describe("Array of numbers")
}, async (params) => {
  const sum = params.numbers.reduce((a, b) => a + b, 0);
  const mean = sum / params.numbers.length;
  return {
    content: [{
      type: "text",
      text: `Mean of [${params.numbers.join(', ')}] = ${mean}`
    }]
  };
});

server.tool("median", {
  numbers: z.array(z.number()).min(1).describe("Array of numbers")
}, async (params) => {
  const sorted = [...params.numbers].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
  return {
    content: [{
      type: "text",
      text: `Median of [${params.numbers.join(', ')}] = ${median}`
    }]
  };
});

server.tool("mode", {
  numbers: z.array(z.number()).min(1).describe("Array of numbers")
}, async (params) => {
  const frequency = {};
  params.numbers.forEach(n => {
    frequency[n] = (frequency[n] || 0) + 1;
  });
  const maxFreq = Math.max(...Object.values(frequency));
  const modes = Object.keys(frequency)
    .filter(n => frequency[n] === maxFreq)
    .map(Number);
  return {
    content: [{
      type: "text",
      text: `Mode(s) of [${params.numbers.join(', ')}] = [${modes.join(', ')}] (appears ${maxFreq} time(s))`
    }]
  };
});

server.tool("standard_deviation", {
  numbers: z.array(z.number()).min(2).describe("Array of numbers (at least 2 required)")
}, async (params) => {
  const mean = params.numbers.reduce((a, b) => a + b, 0) / params.numbers.length;
  const variance = params.numbers.reduce((sum, n) => sum + Math.pow(n - mean, 2), 0) / params.numbers.length;
  const stdDev = Math.sqrt(variance);
  return {
    content: [{
      type: "text",
      text: `Standard deviation of [${params.numbers.join(', ')}] = ${stdDev.toFixed(6)}`
    }]
  };
});

server.tool("variance", {
  numbers: z.array(z.number()).min(2).describe("Array of numbers (at least 2 required)")
}, async (params) => {
  const mean = params.numbers.reduce((a, b) => a + b, 0) / params.numbers.length;
  const variance = params.numbers.reduce((sum, n) => sum + Math.pow(n - mean, 2), 0) / params.numbers.length;
  return {
    content: [{
      type: "text",
      text: `Variance of [${params.numbers.join(', ')}] = ${variance.toFixed(6)}`
    }]
  };
});

server.tool("min", {
  numbers: z.array(z.number()).min(1).describe("Array of numbers")
}, async (params) => {
  const min = Math.min(...params.numbers);
  return {
    content: [{
      type: "text",
      text: `Minimum of [${params.numbers.join(', ')}] = ${min}`
    }]
  };
});

server.tool("max", {
  numbers: z.array(z.number()).min(1).describe("Array of numbers")
}, async (params) => {
  const max = Math.max(...params.numbers);
  return {
    content: [{
      type: "text",
      text: `Maximum of [${params.numbers.join(', ')}] = ${max}`
    }]
  };
});

server.tool("sum", {
  numbers: z.array(z.number()).describe("Array of numbers")
}, async (params) => {
  const sum = params.numbers.reduce((a, b) => a + b, 0);
  return {
    content: [{
      type: "text",
      text: `Sum of [${params.numbers.join(', ')}] = ${sum}`
    }]
  };
});

server.tool("product", {
  numbers: z.array(z.number()).describe("Array of numbers")
}, async (params) => {
  const product = params.numbers.reduce((a, b) => a * b, 1);
  return {
    content: [{
      type: "text",
      text: `Product of [${params.numbers.join(', ')}] = ${product}`
    }]
  };
});

// ============================================================================
// Number Theory
// ============================================================================

server.tool("gcd", {
  a: z.number().int().positive().describe("First positive integer"),
  b: z.number().int().positive().describe("Second positive integer")
}, async (params) => {
  const gcd = (a, b) => b === 0 ? a : gcd(b, a % b);
  const result = gcd(params.a, params.b);
  return {
    content: [{
      type: "text",
      text: `GCD(${params.a}, ${params.b}) = ${result}`
    }]
  };
});

server.tool("lcm", {
  a: z.number().int().positive().describe("First positive integer"),
  b: z.number().int().positive().describe("Second positive integer")
}, async (params) => {
  const gcd = (a, b) => b === 0 ? a : gcd(b, a % b);
  const lcm = (params.a * params.b) / gcd(params.a, params.b);
  return {
    content: [{
      type: "text",
      text: `LCM(${params.a}, ${params.b}) = ${lcm}`
    }]
  };
});

server.tool("is_prime", {
  n: z.number().int().min(2).describe("Integer to check for primality")
}, async (params) => {
  if (params.n < 2) {
    return {
      content: [{
        type: "text",
        text: `${params.n} is not prime (must be >= 2)`
      }]
    };
  }
  if (params.n === 2) {
    return {
      content: [{
        type: "text",
        text: `${params.n} is prime`
      }]
    };
  }
  if (params.n % 2 === 0) {
    return {
      content: [{
        type: "text",
        text: `${params.n} is not prime (divisible by 2)`
      }]
    };
  }
  const sqrt = Math.sqrt(params.n);
  for (let i = 3; i <= sqrt; i += 2) {
    if (params.n % i === 0) {
      return {
        content: [{
          type: "text",
          text: `${params.n} is not prime (divisible by ${i})`
        }]
      };
    }
  }
  return {
    content: [{
      type: "text",
      text: `${params.n} is prime`
    }]
  };
});

server.tool("factorize", {
  n: z.number().int().min(2).max(1000000).describe("Integer to factorize")
}, async (params) => {
  const factors = [];
  let num = params.n;
  let divisor = 2;
  
  while (divisor * divisor <= num) {
    while (num % divisor === 0) {
      factors.push(divisor);
      num /= divisor;
    }
    divisor++;
  }
  
  if (num > 1) {
    factors.push(num);
  }
  
  return {
    content: [{
      type: "text",
      text: `Prime factors of ${params.n}: ${factors.join(' × ')}`
    }]
  };
});

// ============================================================================
// Combinatorics
// ============================================================================

server.tool("permutation", {
  n: z.number().int().min(0).max(20).describe("Total number of items"),
  r: z.number().int().min(0).describe("Number of items to select")
}, async (params) => {
  if (params.r > params.n) {
    return {
      content: [{
        type: "text",
        text: "Error: r cannot be greater than n"
      }]
    };
  }
  
  let result = 1;
  for (let i = 0; i < params.r; i++) {
    result *= (params.n - i);
  }
  
  return {
    content: [{
      type: "text",
      text: `P(${params.n}, ${params.r}) = ${result}\n(Number of ways to arrange ${params.r} items from ${params.n})`
    }]
  };
});

server.tool("combination", {
  n: z.number().int().min(0).max(30).describe("Total number of items"),
  r: z.number().int().min(0).describe("Number of items to select")
}, async (params) => {
  if (params.r > params.n) {
    return {
      content: [{
        type: "text",
        text: "Error: r cannot be greater than n"
      }]
    };
  }
  
  let numerator = 1;
  let denominator = 1;
  
  for (let i = 0; i < params.r; i++) {
    numerator *= (params.n - i);
    denominator *= (i + 1);
  }
  
  const result = numerator / denominator;
  
  return {
    content: [{
      type: "text",
      text: `C(${params.n}, ${params.r}) = ${result}\n(Number of ways to choose ${params.r} items from ${params.n})`
    }]
  };
});

server.tool("binomial_coefficient", {
  n: z.number().int().min(0).describe("n"),
  k: z.number().int().min(0).describe("k")
}, async (params) => {
  if (params.k > params.n) {
    return {
      content: [{
        type: "text",
        text: "0 (k > n)"
      }]
    };
  }
  
  // Optimize by using smaller of k or n-k
  let k = Math.min(params.k, params.n - params.k);
  let result = 1;
  
  for (let i = 0; i < k; i++) {
    result *= (params.n - i);
    result /= (i + 1);
  }
  
  return {
    content: [{
      type: "text",
      text: `Binomial Coefficient C(${params.n}, ${params.k}) = ${Math.round(result)}`
    }]
  };
});

// ============================================================================
// Vector Operations
// ============================================================================

server.tool("dot_product", {
  vector1: z.array(z.number()).describe("First vector"),
  vector2: z.array(z.number()).describe("Second vector")
}, async (params) => {
  if (params.vector1.length !== params.vector2.length) {
    return {
      content: [{
        type: "text",
        text: "Error: Vectors must have the same dimension"
      }]
    };
  }
  
  const result = params.vector1.reduce((sum, val, i) => sum + val * params.vector2[i], 0);
  
  return {
    content: [{
      type: "text",
      text: `Dot Product: ${result}\n[${params.vector1.join(', ')}] · [${params.vector2.join(', ')}] = ${result}`
    }]
  };
});

server.tool("vector_magnitude", {
  vector: z.array(z.number()).describe("Vector to calculate magnitude of")
}, async (params) => {
  const magnitude = Math.sqrt(params.vector.reduce((sum, val) => sum + val * val, 0));
  
  return {
    content: [{
      type: "text",
      text: `Magnitude of [${params.vector.join(', ')}] = ${magnitude}`
    }]
  };
});

server.tool("cross_product", {
  vector1: z.array(z.number()).length(3).describe("First 3D vector"),
  vector2: z.array(z.number()).length(3).describe("Second 3D vector")
}, async (params) => {
  const [a1, a2, a3] = params.vector1;
  const [b1, b2, b3] = params.vector2;
  
  const result = [
    a2 * b3 - a3 * b2,
    a3 * b1 - a1 * b3,
    a1 * b2 - a2 * b1
  ];
  
  return {
    content: [{
      type: "text",
      text: `Cross Product:\n[${params.vector1.join(', ')}] × [${params.vector2.join(', ')}] = [${result.join(', ')}]`
    }]
  };
});

// ============================================================================
// Advanced Statistics
// ============================================================================

server.tool("percentile", {
  numbers: z.array(z.number()).min(1).describe("Array of numbers"),
  percentile: z.number().min(0).max(100).describe("Percentile to calculate (0-100)")
}, async (params) => {
  const sorted = [...params.numbers].sort((a, b) => a - b);
  const index = (params.percentile / 100) * (sorted.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  const weight = index - lower;
  
  const result = lower === upper
    ? sorted[lower]
    : sorted[lower] * (1 - weight) + sorted[upper] * weight;
  
  return {
    content: [{
      type: "text",
      text: `${params.percentile}th percentile = ${result}`
    }]
  };
});

server.tool("z_score", {
  value: z.number().describe("Value to calculate z-score for"),
  numbers: z.array(z.number()).min(2).describe("Dataset")
}, async (params) => {
  const mean = params.numbers.reduce((a, b) => a + b, 0) / params.numbers.length;
  const variance = params.numbers.reduce((sum, n) => sum + Math.pow(n - mean, 2), 0) / params.numbers.length;
  const stdDev = Math.sqrt(variance);
  const zScore = (params.value - mean) / stdDev;
  
  return {
    content: [{
      type: "text",
      text: `Z-Score Analysis:\nValue: ${params.value}\nMean: ${mean.toFixed(4)}\nStd Dev: ${stdDev.toFixed(4)}\nZ-Score: ${zScore.toFixed(4)}`
    }]
  };
});

server.tool("correlation", {
  x: z.array(z.number()).min(2).describe("First dataset"),
  y: z.array(z.number()).min(2).describe("Second dataset")
}, async (params) => {
  if (params.x.length !== params.y.length) {
    return {
      content: [{
        type: "text",
        text: "Error: Datasets must have the same length"
      }]
    };
  }
  
  const n = params.x.length;
  const meanX = params.x.reduce((a, b) => a + b, 0) / n;
  const meanY = params.y.reduce((a, b) => a + b, 0) / n;
  
  let numerator = 0;
  let sumSqX = 0;
  let sumSqY = 0;
  
  for (let i = 0; i < n; i++) {
    const dx = params.x[i] - meanX;
    const dy = params.y[i] - meanY;
    numerator += dx * dy;
    sumSqX += dx * dx;
    sumSqY += dy * dy;
  }
  
  const correlation = numerator / Math.sqrt(sumSqX * sumSqY);
  
  return {
    content: [{
      type: "text",
      text: `Pearson Correlation Coefficient: ${correlation.toFixed(6)}\n${Math.abs(correlation) > 0.7 ? 'Strong' : Math.abs(correlation) > 0.3 ? 'Moderate' : 'Weak'} ${correlation > 0 ? 'positive' : 'negative'} correlation`
    }]
  };
});

// ============================================================================
// Financial Calculations
// ============================================================================

server.tool("compound_interest", {
  principal: z.number().positive().describe("Initial principal amount"),
  rate: z.number().min(0).max(1).describe("Annual interest rate (as decimal, e.g., 0.05 for 5%)"),
  time: z.number().positive().describe("Time in years"),
  compoundingFrequency: z.number().int().min(1).optional().default(1).describe("Compounding frequency per year")
}, async (params) => {
  const amount = params.principal * Math.pow(1 + params.rate / params.compoundingFrequency, 
    params.compoundingFrequency * params.time);
  const interest = amount - params.principal;
  return {
    content: [{
      type: "text",
      text: `Compound Interest Calculation:
Principal: $${params.principal.toFixed(2)}
Rate: ${(params.rate * 100).toFixed(2)}%
Time: ${params.time} years
Compounding: ${params.compoundingFrequency}x per year
Final Amount: $${amount.toFixed(2)}
Interest Earned: $${interest.toFixed(2)}`
    }]
  };
});

server.tool("present_value", {
  futureValue: z.number().positive().describe("Future value"),
  rate: z.number().min(0).max(1).describe("Discount rate (as decimal)"),
  periods: z.number().positive().describe("Number of periods")
}, async (params) => {
  const pv = params.futureValue / Math.pow(1 + params.rate, params.periods);
  return {
    content: [{
      type: "text",
      text: `Present Value:
Future Value: $${params.futureValue.toFixed(2)}
Rate: ${(params.rate * 100).toFixed(2)}%
Periods: ${params.periods}
Present Value: $${pv.toFixed(2)}`
    }]
  };
});

// ============================================================================
// Matrix Operations
// ============================================================================

server.tool("matrix_add", {
  matrix1: z.array(z.array(z.number())).describe("First matrix (2D array)"),
  matrix2: z.array(z.array(z.number())).describe("Second matrix (2D array)")
}, async (params) => {
  if (params.matrix1.length !== params.matrix2.length || 
      params.matrix1[0].length !== params.matrix2[0].length) {
    return {
      content: [{
        type: "text",
        text: "Error: Matrices must have the same dimensions"
      }]
    };
  }
  const result = params.matrix1.map((row, i) => 
    row.map((val, j) => val + params.matrix2[i][j])
  );
  return {
    content: [{
      type: "text",
      text: `Matrix Addition Result:\n${result.map(row => `[${row.join(', ')}]`).join('\n')}`
    }]
  };
});

server.tool("matrix_multiply", {
  matrix1: z.array(z.array(z.number())).describe("First matrix (m×n)"),
  matrix2: z.array(z.array(z.number())).describe("Second matrix (n×p)")
}, async (params) => {
  if (params.matrix1[0].length !== params.matrix2.length) {
    return {
      content: [{
        type: "text",
        text: "Error: Number of columns in first matrix must equal number of rows in second matrix"
      }]
    };
  }
  const result = params.matrix1.map(row1 =>
    params.matrix2[0].map((_, j) =>
      row1.reduce((sum, val, k) => sum + val * params.matrix2[k][j], 0)
    )
  );
  return {
    content: [{
      type: "text",
      text: `Matrix Multiplication Result:\n${result.map(row => `[${row.join(', ')}]`).join('\n')}`
    }]
  };
});

server.tool("matrix_transpose", {
  matrix: z.array(z.array(z.number())).describe("Matrix to transpose")
}, async (params) => {
  const result = params.matrix[0].map((_, j) =>
    params.matrix.map(row => row[j])
  );
  return {
    content: [{
      type: "text",
      text: `Transposed Matrix:\n${result.map(row => `[${row.join(', ')}]`).join('\n')}`
    }]
  };
});

server.tool("matrix_determinant", {
  matrix: z.array(z.array(z.number())).describe("Square matrix (2x2 or 3x3)")
}, async (params) => {
  if (params.matrix.length !== params.matrix[0].length) {
    return {
      content: [{
        type: "text",
        text: "Error: Matrix must be square"
      }]
    };
  }
  if (params.matrix.length === 2) {
    const det = params.matrix[0][0] * params.matrix[1][1] - params.matrix[0][1] * params.matrix[1][0];
    return {
      content: [{
        type: "text",
        text: `Determinant: ${det}`
      }]
    };
  }
  if (params.matrix.length === 3) {
    const det = params.matrix[0][0] * (params.matrix[1][1] * params.matrix[2][2] - params.matrix[1][2] * params.matrix[2][1]) -
                params.matrix[0][1] * (params.matrix[1][0] * params.matrix[2][2] - params.matrix[1][2] * params.matrix[2][0]) +
                params.matrix[0][2] * (params.matrix[1][0] * params.matrix[2][1] - params.matrix[1][1] * params.matrix[2][0]);
    return {
      content: [{
        type: "text",
        text: `Determinant: ${det}`
      }]
    };
  }
  return {
    content: [{
      type: "text",
      text: "Error: Only 2x2 and 3x3 matrices are supported"
    }]
  };
});

// ============================================================================
// Server Initialization
// ============================================================================

await server.connect(new StdioServerTransport()); 