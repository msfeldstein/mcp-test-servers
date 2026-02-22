#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import {
  registerAppResource,
  registerAppTool,
  RESOURCE_MIME_TYPE,
} from "@modelcontextprotocol/ext-apps/server";

const RESOURCE_URI = "ui://graphing-server/main";

const UI_HTML = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Graph</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
      body {
        margin: 0;
        padding: 0;
        background: #ffffff;
      }
      .wrapper {
        width: 100%;
        height: 360px;
        min-height: 360px;
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      canvas {
        width: 100% !important;
        height: 100% !important;
        display: block;
      }
    </style>
  </head>
  <body>
    <div class="wrapper">
      <canvas id="chart"></canvas>
    </div>

    <script type="module">
      let nextId = 1;
      const pending = new Map();
      const chartCanvas = document.getElementById("chart");
      let chartInstance = null;
      let currentTheme = "light";
      let currentToolInput = null;

      const defaultConfig = {
        chartType: "line",
        title: "Monthly Trends",
        labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
        datasets: [
          {
            label: "Revenue",
            values: [12, 19, 13, 17, 15, 21],
            borderColor: "#2563eb",
          },
          {
            label: "Expenses",
            values: [9, 14, 11, 13, 12, 16],
            borderColor: "#dc2626",
          },
        ],
      };

      function sendRequest(method, params) {
        const id = nextId++;
        window.parent.postMessage({ jsonrpc: "2.0", id, method, params }, "*");
        return new Promise((resolve, reject) => {
          pending.set(id, { resolve, reject });
        });
      }

      function sendNotification(method, params) {
        window.parent.postMessage({ jsonrpc: "2.0", method, params }, "*");
      }

      function getThemePalette(theme) {
        if (theme === "dark") {
          return {
            background: "#111827",
            text: "#e5e7eb",
            grid: "rgba(229, 231, 235, 0.2)",
          };
        }
        return {
          background: "#ffffff",
          text: "#111827",
          grid: "#e5e7eb",
        };
      }

      function applyTheme(theme) {
        const palette = getThemePalette(theme);
        document.body.style.background = palette.background;
      }

      function applyThemeToConfig(config) {
        const palette = getThemePalette(currentTheme);

        config.options = config.options || {};
        config.options.plugins = config.options.plugins || {};
        config.options.plugins.legend = config.options.plugins.legend || {};
        config.options.plugins.title = config.options.plugins.title || {};
        config.options.plugins.legend.labels = config.options.plugins.legend.labels || {};
        config.options.plugins.legend.labels.color = config.options.plugins.legend.labels.color || palette.text;
        config.options.plugins.title.color = config.options.plugins.title.color || palette.text;

        config.options.scales = config.options.scales || {};
        config.options.scales.x = config.options.scales.x || {};
        config.options.scales.y = config.options.scales.y || {};
        config.options.scales.x.grid = config.options.scales.x.grid || {};
        config.options.scales.y.grid = config.options.scales.y.grid || {};
        config.options.scales.x.ticks = config.options.scales.x.ticks || {};
        config.options.scales.y.ticks = config.options.scales.y.ticks || {};
        config.options.scales.x.grid.color = config.options.scales.x.grid.color || palette.grid;
        config.options.scales.y.grid.color = config.options.scales.y.grid.color || palette.grid;
        config.options.scales.x.ticks.color = config.options.scales.x.ticks.color || palette.text;
        config.options.scales.y.ticks.color = config.options.scales.y.ticks.color || palette.text;
      }

      function normalizeChartConfig(input) {
        if (input?.chartConfig && typeof input.chartConfig === "object") {
          const raw = input.chartConfig;
          const type = typeof raw.type === "string" && raw.type.length > 0 ? raw.type : "line";
          const data = raw.data && typeof raw.data === "object" ? raw.data : { labels: [], datasets: [] };
          const options = raw.options && typeof raw.options === "object"
            ? raw.options
            : {
                responsive: true,
                maintainAspectRatio: false,
              };

          return {
            ...raw,
            type,
            data,
            options: {
              responsive: true,
              maintainAspectRatio: false,
              ...options,
            },
          };
        }

        const labels = Array.isArray(input?.labels) && input.labels.length > 0
          ? input.labels.map((x) => String(x))
          : defaultConfig.labels;

        const datasets = Array.isArray(input?.datasets) && input.datasets.length > 0
          ? input.datasets
          : defaultConfig.datasets;

        const chartType = input?.chartType === "bar" ? "bar" : "line";

        return {
          type: chartType,
          data: {
            labels,
            datasets: datasets.map((dataset, idx) => ({
              label: typeof dataset?.label === "string" && dataset.label.length > 0
                ? dataset.label
                : "Series " + (idx + 1),
              data: Array.isArray(dataset?.values)
                ? dataset.values.map((n) => Number(n))
                : [],
              borderColor: dataset?.borderColor || ["#2563eb", "#dc2626", "#059669", "#7c3aed"][idx % 4],
              backgroundColor: dataset?.backgroundColor || (chartType === "bar" ? "rgba(37, 99, 235, 0.35)" : "transparent"),
              borderWidth: 3,
              pointRadius: chartType === "line" ? 2 : 0,
              tension: chartType === "line" ? 0.35 : 0,
            })),
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              title: {
                display: true,
                text: typeof input?.title === "string" && input.title.length > 0 ? input.title : defaultConfig.title,
              },
              legend: {
                display: true,
                position: "top",
              },
            },
            scales: {
              x: { grid: { color: "#e5e7eb" } },
              y: { grid: { color: "#e5e7eb" } },
            },
          },
        };
      }

      function renderGraph(configInput) {
        const config = normalizeChartConfig(configInput);
        applyThemeToConfig(config);
        if (chartInstance) chartInstance.destroy();

        chartInstance = new window.Chart(chartCanvas, config);
      }

      window.addEventListener("message", (event) => {
        const message = event.data;
        if (!message || message.jsonrpc !== "2.0") return;

        if (message.id && pending.has(message.id)) {
          const { resolve, reject } = pending.get(message.id);
          pending.delete(message.id);
          if (message.error) reject(message.error);
          else resolve(message.result);
        }

        if (message.method === "ui/notifications/tool-input") {
          const args = message.params?.arguments || {};
          currentToolInput = args;
          renderGraph(args);
        }

        if (message.method === "ui/notifications/host-context-changed") {
          const theme = message.params?.theme;
          if (theme === "light" || theme === "dark") {
            currentTheme = theme;
            applyTheme(currentTheme);
            renderGraph(currentToolInput || defaultConfig);
          }
        }
      });

      async function initialize() {
        try {
          const initResult = await sendRequest("ui/initialize", {
            protocolVersion: "2026-01-26",
            appInfo: { name: "Graphing UI View", version: "1.0.0" },
            appCapabilities: { availableDisplayModes: ["inline"] },
          });
          if (initResult?.hostContext?.theme === "light" || initResult?.hostContext?.theme === "dark") {
            currentTheme = initResult.hostContext.theme;
          }
          applyTheme(currentTheme);
          sendNotification("ui/notifications/initialized", {});
          currentToolInput = defaultConfig;
          renderGraph(currentToolInput);
        } catch (error) {}
      }

      initialize();
    </script>
  </body>
</html>`;

const server = new McpServer({
  name: "graphing-server",
  version: "1.0.0",
  capabilities: {
    tools: {},
    resources: {},
  },
});

registerAppTool(
  server,
  "show-graphing-ui",
  {
    title: "Show Graphing UI",
    description: "Render an MCP Apps UI with an inline JavaScript chart. Supports raw Chart.js configs.",
    inputSchema: z.object({
      chartConfig: z.any().optional().describe("Raw Chart.js configuration object. If provided, this takes precedence over other fields."),
      chartType: z.enum(["line", "bar"]).optional().describe("Chart type."),
      title: z.string().optional().describe("Chart title."),
      labels: z.array(z.string()).optional().describe("X-axis labels."),
      datasets: z.array(
        z.object({
          label: z.string().describe("Legend label for a dataset."),
          values: z.array(z.number()).describe("Y values for this dataset."),
          borderColor: z.string().optional().describe("Line color (CSS color)."),
          backgroundColor: z.string().optional().describe("Fill/background color (CSS color)."),
        })
      ).optional().describe("One or more chart datasets."),
    }),
    _meta: {
      ui: {
        resourceUri: RESOURCE_URI,
      },
    },
  },
  async () => ({
    content: [
      {
        type: "text",
        text: "Rendered graphing UI.",
      },
    ],
  })
);

registerAppResource(
  server,
  "Graphing UI",
  RESOURCE_URI,
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
        _meta: {
          ui: {
            csp: {
              resourceDomains: ["https://cdn.jsdelivr.net"],
            },
          },
        },
      },
    ],
  })
);

await server.connect(new StdioServerTransport());
