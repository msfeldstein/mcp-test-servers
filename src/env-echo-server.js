#!/usr/bin/env node
// Copyright Anysphere Inc.
// Comprehensive Environment Variable Management Server with extensive manipulation and analysis tools

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

/**
 * Enhanced Environment Variable Server
 * 
 * Provides comprehensive tools for environment variable management:
 * - Reading and listing environment variables
 * - Filtering and searching environment variables
 * - Environment variable analysis and statistics
 * - Pattern matching and validation
 * - Environment variable comparison and diffing
 * - Export/import functionality (simulated)
 * - Security analysis (detecting sensitive data patterns)
 * - Environment variable grouping and categorization
 */

const server = new McpServer(
  {
    name: "env-echo-server",
    version: "2.0.0",
    capabilities: {
      tools: {}
    }
  }
);

// ============================================================================
// Basic Environment Variable Operations
// ============================================================================

server.tool("env_echo", {
  format: z.enum(["plain", "json", "key-value", "export"]).optional().default("plain").describe("Output format: plain, json, key-value, or export (shell export format)")
}, async (params) => {
  const format = params?.format || "plain";
  const envEntries = Object.entries(process.env);
  
  let output;
  switch (format) {
    case "json":
      output = JSON.stringify(process.env, null, 2);
      break;
    case "key-value":
      output = envEntries.map(([key, value]) => `${key}=${value}`).join('\n');
      break;
    case "export":
      output = envEntries.map(([key, value]) => `export ${key}="${value?.replace(/"/g, '\\"') || ''}"`).join('\n');
      break;
    default:
      output = envEntries.map(([key, value]) => `${key}=${value}`).join('\n');
  }
  
  return {
    content: [{
      type: "text",
      text: `Current environment variables (${envEntries.length} total, format: ${format}):\n${output}`
    }]
  };
});

server.tool("get_env_var", {
  varName: z.string().describe("The name of the environment variable to retrieve"),
  defaultValue: z.string().optional().describe("Default value to return if variable is not set")
}, async (params) => {
  const value = process.env[params.varName];
  if (value === undefined) {
    if (params.defaultValue !== undefined) {
      return {
        content: [{
          type: "text",
          text: `Environment variable '${params.varName}' is not set. Using default: ${params.defaultValue}`
        }]
      };
    }
    return {
      content: [{
        type: "text",
        text: `Environment variable '${params.varName}' is not set.`
      }]
    };
  }
  return {
    content: [{
      type: "text",
      text: `${params.varName}=${value}`
    }]
  };
});

server.tool("list_env_vars", {
  filter: z.string().optional().describe("Filter variable names by pattern (case-insensitive substring match)"),
  prefix: z.string().optional().describe("Only list variables starting with this prefix"),
  sort: z.enum(["name", "length", "none"]).optional().default("name").describe("Sort order: name (alphabetical), length (by value length), or none")
}, async (params) => {
  let varNames = Object.keys(process.env);
  
  // Apply filters
  if (params?.filter) {
    const filterLower = params.filter.toLowerCase();
    varNames = varNames.filter(name => name.toLowerCase().includes(filterLower));
  }
  
  if (params?.prefix) {
    varNames = varNames.filter(name => name.startsWith(params.prefix));
  }
  
  // Apply sorting
  if (params?.sort === "name") {
    varNames.sort();
  } else if (params?.sort === "length") {
    varNames.sort((a, b) => {
      const lenA = (process.env[a] || '').length;
      const lenB = (process.env[b] || '').length;
      return lenB - lenA; // Descending order
    });
  }
  
  return {
    content: [{
      type: "text",
      text: `Available environment variables (${varNames.length} total):\n${varNames.join('\n')}`
    }]
  };
});

// ============================================================================
// Environment Variable Analysis
// ============================================================================

server.tool("analyze_env", {
  category: z.enum(["all", "sensitive", "paths", "urls", "ports", "numbers"]).optional().default("all").describe("Category to analyze")
}, async (params) => {
  const category = params?.category || "all";
  const envEntries = Object.entries(process.env);
  
  const analysis = {
    total: envEntries.length,
    byLength: { short: 0, medium: 0, long: 0 },
    byType: { paths: 0, urls: 0, numbers: 0, booleans: 0, sensitive: 0 },
    longest: { name: '', length: 0 },
    shortest: { name: '', length: Infinity }
  };
  
  const sensitivePatterns = [
    /password/i, /secret/i, /key/i, /token/i, /api[_-]?key/i,
    /credential/i, /auth/i, /private/i
  ];
  
  envEntries.forEach(([key, value]) => {
    const valStr = value || '';
    const valLen = valStr.length;
    
    // Length categorization
    if (valLen < 20) analysis.byLength.short++;
    else if (valLen < 100) analysis.byLength.medium++;
    else analysis.byLength.long++;
    
    // Type detection
    if (valStr.includes('/') || valStr.includes('\\')) analysis.byType.paths++;
    if (/^https?:\/\//i.test(valStr)) analysis.byType.urls++;
    if (/^\d+$/.test(valStr)) analysis.byType.numbers++;
    if (/^(true|false|yes|no|1|0)$/i.test(valStr)) analysis.byType.booleans++;
    if (sensitivePatterns.some(pattern => pattern.test(key))) analysis.byType.sensitive++;
    
    // Longest/shortest tracking
    if (valLen > analysis.longest.length) {
      analysis.longest = { name: key, length: valLen };
    }
    if (valLen < analysis.shortest.length && valLen > 0) {
      analysis.shortest = { name: key, length: valLen };
    }
  });
  
  let output = `Environment Variable Analysis (${category}):\n`;
  output += `─`.repeat(50) + '\n';
  output += `Total Variables: ${analysis.total}\n`;
  output += `\nLength Distribution:\n`;
  output += `  Short (<20 chars): ${analysis.byLength.short}\n`;
  output += `  Medium (20-100 chars): ${analysis.byLength.medium}\n`;
  output += `  Long (>100 chars): ${analysis.byLength.long}\n`;
  output += `\nType Distribution:\n`;
  output += `  Paths: ${analysis.byType.paths}\n`;
  output += `  URLs: ${analysis.byType.urls}\n`;
  output += `  Numbers: ${analysis.byType.numbers}\n`;
  output += `  Booleans: ${analysis.byType.booleans}\n`;
  output += `  Potentially Sensitive: ${analysis.byType.sensitive}\n`;
  output += `\nExtremes:\n`;
  output += `  Longest value: ${analysis.longest.name} (${analysis.longest.length} chars)\n`;
  output += `  Shortest value: ${analysis.shortest.name} (${analysis.shortest.length} chars)\n`;
  
  return {
    content: [{
      type: "text",
      text: output
    }]
  };
});

server.tool("find_sensitive_env", {
  includeValues: z.boolean().optional().default(false).describe("Include actual values in output (use with caution)")
}, async (params) => {
  const sensitivePatterns = [
    { pattern: /password/i, category: "Password" },
    { pattern: /secret/i, category: "Secret" },
    { pattern: /api[_-]?key/i, category: "API Key" },
    { pattern: /token/i, category: "Token" },
    { pattern: /credential/i, category: "Credential" },
    { pattern: /private[_-]?key/i, category: "Private Key" },
    { pattern: /access[_-]?token/i, category: "Access Token" }
  ];
  
  const sensitiveVars = [];
  
  Object.entries(process.env).forEach(([key, value]) => {
    sensitivePatterns.forEach(({ pattern, category }) => {
      if (pattern.test(key)) {
        sensitiveVars.push({
          name: key,
          category,
          value: params.includeValues ? value : '[REDACTED]'
        });
      }
    });
  });
  
  if (sensitiveVars.length === 0) {
    return {
      content: [{
        type: "text",
        text: "No potentially sensitive environment variables found."
      }]
    };
  }
  
  let output = `Found ${sensitiveVars.length} potentially sensitive environment variable(s):\n`;
  output += `─`.repeat(50) + '\n';
  sensitiveVars.forEach(({ name, category, value }) => {
    output += `${category}: ${name} = ${value}\n`;
  });
  
  return {
    content: [{
      type: "text",
      text: output
    }]
  };
});

// ============================================================================
// Environment Variable Filtering and Search
// ============================================================================

server.tool("filter_env_by_pattern", {
  pattern: z.string().describe("Regex pattern to match against variable names (case-insensitive)"),
  includeValues: z.boolean().optional().default(true).describe("Include variable values in output")
}, async (params) => {
  try {
    const regex = new RegExp(params.pattern, 'i');
    const matches = Object.entries(process.env)
      .filter(([key]) => regex.test(key))
      .map(([key, value]) => params.includeValues ? `${key}=${value}` : key);
    
    if (matches.length === 0) {
      return {
        content: [{
          type: "text",
          text: `No environment variables matched pattern "${params.pattern}"`
        }]
      };
    }
    
    return {
      content: [{
        type: "text",
        text: `Found ${matches.length} matching variable(s):\n${matches.join('\n')}`
      }]
    };
  } catch (error) {
    return {
      content: [{
        type: "text",
        text: `Error: Invalid regex pattern - ${error.message}`
      }]
    };
  }
});

server.tool("group_env_by_prefix", {
  minGroupSize: z.number().int().min(1).optional().default(1).describe("Minimum number of variables required to form a group")
}, async (params) => {
  const groups = {};
  
  Object.keys(process.env).forEach(key => {
    // Find common prefixes (2-10 characters)
    for (let len = 2; len <= Math.min(10, key.length); len++) {
      const prefix = key.substring(0, len);
      if (!groups[prefix]) {
        groups[prefix] = [];
      }
      groups[prefix].push(key);
    }
  });
  
  // Filter groups by minimum size and sort
  const validGroups = Object.entries(groups)
    .filter(([_, vars]) => vars.length >= params.minGroupSize)
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 20); // Top 20 groups
  
  if (validGroups.length === 0) {
    return {
      content: [{
        type: "text",
        text: `No variable groups found with minimum size ${params.minGroupSize}`
      }]
    };
  }
  
  let output = `Environment Variable Groups (top ${validGroups.length}):\n`;
  output += `─`.repeat(50) + '\n';
  validGroups.forEach(([prefix, vars]) => {
    output += `${prefix}* (${vars.length} variables):\n`;
    vars.slice(0, 10).forEach(v => output += `  - ${v}\n`);
    if (vars.length > 10) {
      output += `  ... and ${vars.length - 10} more\n`;
    }
  });
  
  return {
    content: [{
      type: "text",
      text: output
    }]
  };
});

// ============================================================================
// Environment Variable Comparison
// ============================================================================

server.tool("compare_env_sets", {
  set1Prefix: z.string().optional().describe("Prefix for first set of variables"),
  set2Prefix: z.string().optional().describe("Prefix for second set of variables"),
  showCommon: z.boolean().optional().default(true).describe("Show variables common to both sets"),
  showUnique: z.boolean().optional().default(true).describe("Show variables unique to each set")
}, async (params) => {
  const allVars = Object.keys(process.env);
  
  let set1, set2;
  if (params.set1Prefix && params.set2Prefix) {
    set1 = allVars.filter(v => v.startsWith(params.set1Prefix));
    set2 = allVars.filter(v => v.startsWith(params.set2Prefix));
  } else {
    // Split by first half / second half alphabetically
    const sorted = [...allVars].sort();
    const mid = Math.floor(sorted.length / 2);
    set1 = sorted.slice(0, mid);
    set2 = sorted.slice(mid);
  }
  
  const set1Set = new Set(set1);
  const set2Set = new Set(set2);
  const common = set1.filter(v => set2Set.has(v));
  const unique1 = set1.filter(v => !set2Set.has(v));
  const unique2 = set2.filter(v => !set1Set.has(v));
  
  let output = `Environment Variable Comparison:\n`;
  output += `─`.repeat(50) + '\n';
  output += `Set 1: ${set1.length} variables\n`;
  output += `Set 2: ${set2.length} variables\n`;
  output += `\n`;
  
  if (params.showCommon) {
    output += `Common variables (${common.length}):\n`;
    common.slice(0, 20).forEach(v => output += `  - ${v}\n`);
    if (common.length > 20) output += `  ... and ${common.length - 20} more\n`;
    output += `\n`;
  }
  
  if (params.showUnique) {
    output += `Unique to Set 1 (${unique1.length}):\n`;
    unique1.slice(0, 20).forEach(v => output += `  - ${v}\n`);
    if (unique1.length > 20) output += `  ... and ${unique1.length - 20} more\n`;
    output += `\n`;
    
    output += `Unique to Set 2 (${unique2.length}):\n`;
    unique2.slice(0, 20).forEach(v => output += `  - ${v}\n`);
    if (unique2.length > 20) output += `  ... and ${unique2.length - 20} more\n`;
  }
  
  return {
    content: [{
      type: "text",
      text: output
    }]
  };
});

// ============================================================================
// Environment Variable Statistics
// ============================================================================

server.tool("env_statistics", {
  includeDetails: z.boolean().optional().default(false).describe("Include detailed statistics")
}, async (params) => {
  const envEntries = Object.entries(process.env);
  const totalChars = envEntries.reduce((sum, [k, v]) => sum + k.length + (v?.length || 0), 0);
  const avgValueLength = envEntries.reduce((sum, [, v]) => sum + (v?.length || 0), 0) / envEntries.length;
  
  const prefixes = {};
  envEntries.forEach(([key]) => {
    const prefix = key.substring(0, Math.min(3, key.length));
    prefixes[prefix] = (prefixes[prefix] || 0) + 1;
  });
  
  const topPrefixes = Object.entries(prefixes)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);
  
  let output = `Environment Variable Statistics:\n`;
  output += `─`.repeat(50) + '\n';
  output += `Total Variables: ${envEntries.length}\n`;
  output += `Total Characters: ${totalChars.toLocaleString()}\n`;
  output += `Average Value Length: ${avgValueLength.toFixed(2)} characters\n`;
  output += `\nTop 10 Prefixes:\n`;
  topPrefixes.forEach(([prefix, count]) => {
    output += `  ${prefix}*: ${count} variables\n`;
  });
  
  if (params.includeDetails) {
    const lengthDist = { '0-10': 0, '11-50': 0, '51-100': 0, '100+': 0 };
    envEntries.forEach(([, value]) => {
      const len = (value || '').length;
      if (len <= 10) lengthDist['0-10']++;
      else if (len <= 50) lengthDist['11-50']++;
      else if (len <= 100) lengthDist['51-100']++;
      else lengthDist['100+']++;
    });
    
    output += `\nValue Length Distribution:\n`;
    Object.entries(lengthDist).forEach(([range, count]) => {
      output += `  ${range} chars: ${count} variables\n`;
    });
  }
  
  return {
    content: [{
      type: "text",
      text: output
    }]
  };
});

// ============================================================================
// Server Initialization
// ============================================================================

await server.connect(new StdioServerTransport()); 