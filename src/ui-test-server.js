#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  registerAppResource,
  registerAppTool,
  RESOURCE_MIME_TYPE,
} from "@modelcontextprotocol/ext-apps/server";

const RESOURCE_URI = "ui://ui-test-server/dashboard";

const UI_HTML = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>MCP UI Test</title>
    <style>
      :root {
        --color-background-primary: #ffffff;
        --color-background-secondary: #f6f6f6;
        --color-text-primary: #1f1f1f;
        --color-text-secondary: #5a5a5a;
        --color-border-primary: #e1e1e1;
        --border-radius-md: 10px;
        --font-sans: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }
      body {
        margin: 0;
        padding: 16px;
        font-family: var(--font-sans);
        background: var(--color-background-primary);
        color: var(--color-text-primary);
      }
      .card {
        border: 1px solid var(--color-border-primary);
        border-radius: var(--border-radius-md);
        padding: 16px;
        background: var(--color-background-secondary);
      }
      .header {
        display: flex;
        justify-content: space-between;
        align-items: baseline;
        gap: 12px;
      }
      .title {
        font-size: 18px;
        font-weight: 600;
      }
      .subtitle {
        color: var(--color-text-secondary);
        font-size: 12px;
      }
      .metrics {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
        gap: 12px;
        margin-top: 16px;
      }
      .metric {
        background: #ffffff;
        border: 1px solid var(--color-border-primary);
        border-radius: 8px;
        padding: 12px;
      }
      .metric-label {
        font-size: 12px;
        color: var(--color-text-secondary);
      }
      .metric-value {
        font-size: 20px;
        font-weight: 600;
        margin-top: 4px;
      }
      .actions {
        margin-top: 16px;
        display: flex;
        gap: 8px;
      }
      button {
        border: 1px solid var(--color-border-primary);
        background: #ffffff;
        padding: 8px 12px;
        border-radius: 6px;
        cursor: pointer;
        font-size: 13px;
      }
      button:disabled {
        opacity: 0.6;
        cursor: default;
      }
      .log {
        margin-top: 12px;
        font-size: 12px;
        color: var(--color-text-secondary);
      }
    </style>
  </head>
  <body>
    <div class="card">
      <div class="header">
        <div class="title" id="title">Loading dashboard...</div>
        <div class="subtitle" id="updatedAt">--</div>
      </div>
      <div class="metrics" id="metrics"></div>
      <div class="actions">
        <button id="refreshBtn">Refresh metrics</button>
      </div>
      <div class="log" id="log">Waiting for tool result...</div>
    </div>
    <script type="module">
      let nextId = 1;
      const pending = new Map();

      const titleEl = document.getElementById("title");
      const updatedAtEl = document.getElementById("updatedAt");
      const metricsEl = document.getElementById("metrics");
      const logEl = document.getElementById("log");
      const refreshBtn = document.getElementById("refreshBtn");

      function sendRequest(method, params) {
        const id = nextId++;
        const message = { jsonrpc: "2.0", id, method, params };
        window.parent.postMessage(message, "*");
        return new Promise((resolve, reject) => {
          pending.set(id, { resolve, reject });
        });
      }

      function sendNotification(method, params) {
        const message = { jsonrpc: "2.0", method, params };
        window.parent.postMessage(message, "*");
      }

      function setLog(text) {
        logEl.textContent = text;
      }

      function renderMetrics(data) {
        const title = data?.title || "UI Metrics";
        const updatedAt = data?.updatedAt || "--";
        const metrics = Array.isArray(data?.metrics) ? data.metrics : [];

        titleEl.textContent = title;
        updatedAtEl.textContent = updatedAt;
        metricsEl.replaceChildren();

        if (metrics.length === 0) {
          const empty = document.createElement("div");
          empty.className = "metric";
          const label = document.createElement("div");
          label.className = "metric-label";
          label.textContent = "No metrics";
          const value = document.createElement("div");
          value.className = "metric-value";
          value.textContent = "--";
          empty.appendChild(label);
          empty.appendChild(value);
          metricsEl.appendChild(empty);
          return;
        }

        metrics.forEach((metric) => {
          const card = document.createElement("div");
          card.className = "metric";
          const label = document.createElement("div");
          label.className = "metric-label";
          label.textContent = metric.label || "Metric";
          const value = document.createElement("div");
          value.className = "metric-value";
          value.textContent = metric.value ?? "--";
          card.appendChild(label);
          card.appendChild(value);
          metricsEl.appendChild(card);
        });
      }

      async function refreshMetrics() {
        refreshBtn.disabled = true;
        setLog("Requesting new metrics...");
        try {
          const result = await sendRequest("tools/call", {
            name: "ui_dashboard",
            arguments: { title: "UI Metrics Dashboard" },
          });
          if (result?.structuredContent) {
            renderMetrics(result.structuredContent);
            setLog("Metrics refreshed from tools/call.");
          } else {
            setLog("No structuredContent returned.");
          }
        } catch (error) {
          setLog("Refresh failed: " + (error?.message || "unknown error"));
        } finally {
          refreshBtn.disabled = false;
        }
      }

      window.addEventListener("message", (event) => {
        const message = event.data;
        if (!message || message.jsonrpc !== "2.0") return;

        if (message.id && pending.has(message.id)) {
          const { resolve, reject } = pending.get(message.id);
          pending.delete(message.id);
          if (message.error) {
            reject(message.error);
          } else {
            resolve(message.result);
          }
          return;
        }

        if (message.method === "ui/notifications/tool-result") {
          const structured = message.params?.structuredContent;
          if (structured) {
            renderMetrics(structured);
            setLog("Rendered tool result from host.");
          } else {
            setLog("Tool result received, but no structuredContent.");
          }
        }
      });

      refreshBtn.addEventListener("click", () => {
        refreshMetrics();
      });

      async function initialize() {
        try {
          await sendRequest("ui/initialize", {
            protocolVersion: "2026-01-26",
            clientInfo: { name: "UI Test View", version: "1.0.0" },
            appCapabilities: {
              availableDisplayModes: ["inline"],
            },
          });
          sendNotification("ui/notifications/initialized", {});
        } catch (error) {
          setLog("Initialize failed: " + (error?.message || "unknown error"));
        }
      }

      initialize();
    </script>
  </body>
</html>`;

// Create a new MCP server with stdio transport
const server = new McpServer({
  name: "ui-test-server",
  version: "1.0.0",
  capabilities: {
    tools: {},
    resources: {},
  },
});

registerAppTool(
  server,
  "ui_dashboard",
  {
    title: "UI Dashboard",
    description: "Returns data for the MCP UI dashboard view.",
    inputSchema: {
      type: "object",
      properties: {
        title: {
          type: "string",
          description: "Dashboard title for the UI",
        },
      },
    },
    _meta: {
      ui: {
        resourceUri: RESOURCE_URI,
      },
    },
  },
  async (params) => {
    const title = params?.title || "UI Metrics Dashboard";
    const metrics = [
      { label: "Active Users", value: Math.floor(Math.random() * 90) + 10 },
      { label: "Success Rate", value: `${Math.floor(Math.random() * 5) + 95}%` },
      { label: "Latency", value: `${Math.floor(Math.random() * 120) + 40}ms` },
      { label: "Errors (24h)", value: Math.floor(Math.random() * 12) },
    ];

    const structuredContent = {
      title,
      updatedAt: new Date().toISOString(),
      metrics,
    };

    return {
      content: [
        {
          type: "text",
          text: `Dashboard "${title}" generated with ${metrics.length} metrics.`,
        },
      ],
      structuredContent,
    };
  }
);

registerAppResource(
  server,
  RESOURCE_URI,
  "UI Test Dashboard",
  {
    mimeType: RESOURCE_MIME_TYPE,
    _meta: {
      ui: {
        prefersBorder: true,
      },
    },
  },
  async () => ({
    contents: [
      {
        uri: RESOURCE_URI,
        mimeType: RESOURCE_MIME_TYPE,
        text: UI_HTML,
      },
    ],
  })
);

// Connect to the transport and start the server
await server.connect(new StdioServerTransport());
