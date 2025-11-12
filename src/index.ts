import { McpAgent } from "agents/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

// Helper function to make Cloudflare API requests
async function cloudflareApiRequest(
	path: string,
	apiToken: string,
	options: RequestInit = {},
): Promise<Response> {
	const url = `https://api.cloudflare.com/client/v4${path}`;
	return fetch(url, {
		...options,
		headers: {
			Authorization: `Bearer ${apiToken}`,
			"Content-Type": "application/json",
			...options.headers,
		},
	});
}

// Define our MCP agent with tools
export class MyMCP extends McpAgent {
	server = new McpServer({
		name: "Cloudflare MCP Server",
		version: "1.0.0",
	});

	async init() {
		// Simple addition tool
		this.server.tool("add", { a: z.number(), b: z.number() }, async ({ a, b }) => ({
			content: [{ type: "text", text: String(a + b) }],
		}));

		// Calculator tool with multiple operations
		this.server.tool(
			"calculate",
			{
				operation: z.enum(["add", "subtract", "multiply", "divide"]),
				a: z.number(),
				b: z.number(),
			},
			async ({ operation, a, b }) => {
				let result: number;
				switch (operation) {
					case "add":
						result = a + b;
						break;
					case "subtract":
						result = a - b;
						break;
					case "multiply":
						result = a * b;
						break;
					case "divide":
						if (b === 0)
							return {
								content: [
									{
										type: "text",
										text: "Error: Cannot divide by zero",
									},
								],
							};
						result = a / b;
						break;
					default:
						result = 0;
						break;
				}
				return { content: [{ type: "text", text: String(result) }] };
			},
		);

		// Cloudflare Zone Analytics - Get analytics for a zone
		this.server.tool(
			"cloudflare_zone_analytics",
			{
				zone_id: z.string().describe("The Cloudflare zone ID"),
				api_token: z.string().describe("Cloudflare API token with Zone Analytics:Read permission"),
				since: z
					.string()
					.optional()
					.describe("Start date in ISO 8601 format (e.g., 2024-01-01T00:00:00Z). Defaults to 30 days ago."),
				until: z
					.string()
					.optional()
					.describe("End date in ISO 8601 format (e.g., 2024-01-31T23:59:59Z). Defaults to now."),
			},
			async ({ zone_id, api_token, since, until }) => {
				try {
					const sinceParam = since || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
					const untilParam = until || new Date().toISOString();
					const path = `/zones/${zone_id}/analytics/dashboard?since=${sinceParam}&until=${untilParam}`;

					const response = await cloudflareApiRequest(path, api_token);
					const data = (await response.json()) as {
						result?: {
							totals?: {
								requests?: { all?: number };
								bandwidth?: { all?: number };
								uniques?: { all?: number };
								threats?: { all?: number };
								pageviews?: { all?: number };
							};
						};
						errors?: Array<{ message?: string }>;
					};

					if (!response.ok) {
						return {
							content: [
								{
									type: "text",
									text: `Error: ${data.errors?.[0]?.message || "Failed to fetch zone analytics"}`,
								},
							],
						};
					}

					const analytics = data.result;
					const summary = {
						totalRequests: analytics.totals?.requests?.all || 0,
						totalBandwidth: analytics.totals?.bandwidth?.all || 0,
						uniqueVisitors: analytics.totals?.uniques?.all || 0,
						threatsBlocked: analytics.totals?.threats?.all || 0,
						pageViews: analytics.totals?.pageviews?.all || 0,
					};

					return {
						content: [
							{
								type: "text",
								text: JSON.stringify(summary, null, 2),
							},
						],
					};
				} catch (error) {
					return {
						content: [
							{
								type: "text",
								text: `Error fetching zone analytics: ${error instanceof Error ? error.message : String(error)}`,
							},
						],
					};
				}
			},
		);

		// Cloudflare Zone Analytics - Get detailed time series data
		this.server.tool(
			"cloudflare_zone_analytics_timeseries",
			{
				zone_id: z.string().describe("The Cloudflare zone ID"),
				api_token: z.string().describe("Cloudflare API token with Zone Analytics:Read permission"),
				since: z
					.string()
					.optional()
					.describe("Start date in ISO 8601 format (e.g., 2024-01-01T00:00:00Z). Defaults to 7 days ago."),
				until: z
					.string()
					.optional()
					.describe("End date in ISO 8601 format (e.g., 2024-01-31T23:59:59Z). Defaults to now."),
			},
			async ({ zone_id, api_token, since, until }) => {
				try {
					const sinceParam = since || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
					const untilParam = until || new Date().toISOString();
					const path = `/zones/${zone_id}/analytics/dashboard?since=${sinceParam}&until=${untilParam}`;

					const response = await cloudflareApiRequest(path, api_token);
					const data = (await response.json()) as {
						result?: {
							timeseries?: Array<{
								since?: string;
								requests?: { all?: number };
								bandwidth?: { all?: number };
								uniques?: { all?: number };
								threats?: { all?: number };
							}>;
						};
						errors?: Array<{ message?: string }>;
					};

					if (!response.ok) {
						return {
							content: [
								{
									type: "text",
									text: `Error: ${data.errors?.[0]?.message || "Failed to fetch zone analytics"}`,
								},
							],
						};
					}

					const timeseries = data.result?.timeseries || [];
					const simplified = timeseries.map((point) => ({
						timestamp: point.since,
						requests: point.requests?.all || 0,
						bandwidth: point.bandwidth?.all || 0,
						uniqueVisitors: point.uniques?.all || 0,
						threats: point.threats?.all || 0,
					}));

					return {
						content: [
							{
								type: "text",
								text: JSON.stringify(simplified, null, 2),
							},
						],
					};
				} catch (error) {
					return {
						content: [
							{
								type: "text",
								text: `Error fetching time series: ${error instanceof Error ? error.message : String(error)}`,
							},
						],
					};
				}
			},
		);

		// Cloudflare Workers Analytics - Query Workers Analytics Engine
		this.server.tool(
			"cloudflare_workers_analytics",
			{
				account_id: z.string().describe("The Cloudflare account ID"),
				api_token: z.string().describe("Cloudflare API token with Account Analytics:Read permission"),
				dataset: z.string().optional().describe("The Analytics Engine dataset name (default: default)"),
				query: z.string().describe("SQL-like query for the Analytics Engine"),
			},
			async ({ account_id, api_token, dataset = "default", query }) => {
				try {
					// Note: Workers Analytics Engine uses a different API endpoint
					// This is a simplified version - you may need to adjust based on your Analytics Engine setup
					const path = `/accounts/${account_id}/analytics_engine/sql`;
					const response = await cloudflareApiRequest(path, api_token, {
						method: "POST",
						body: JSON.stringify({
							query,
							dataset,
						}),
					});

					const data = (await response.json()) as {
						errors?: Array<{ message?: string }>;
						[key: string]: unknown;
					};

					if (!response.ok) {
						return {
							content: [
								{
									type: "text",
									text: `Error: ${data.errors?.[0]?.message || "Failed to query Workers Analytics"}`,
								},
							],
						};
					}

					return {
						content: [
							{
								type: "text",
								text: JSON.stringify(data, null, 2),
							},
						],
					};
				} catch (error) {
					return {
						content: [
							{
								type: "text",
								text: `Error querying Workers Analytics: ${error instanceof Error ? error.message : String(error)}`,
							},
						],
					};
				}
			},
		);

		// Cloudflare Web Analytics - Get Web Analytics data
		this.server.tool(
			"cloudflare_web_analytics",
			{
				account_id: z.string().describe("The Cloudflare account ID"),
				site_tag: z.string().describe("The Web Analytics site tag"),
				api_token: z.string().describe("Cloudflare API token with Account Analytics:Read permission"),
				start: z.string().optional().describe("Start date in YYYY-MM-DD format. Defaults to 30 days ago."),
				end: z.string().optional().describe("End date in YYYY-MM-DD format. Defaults to today."),
			},
			async ({ account_id, site_tag, api_token, start, end }) => {
				try {
					const startDate = start || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
					const endDate = end || new Date().toISOString().split("T")[0];
					const path = `/accounts/${account_id}/web_analytics/sites/${site_tag}/stats?start=${startDate}&end=${endDate}`;

					const response = await cloudflareApiRequest(path, api_token);
					const data = (await response.json()) as {
						result?: unknown;
						errors?: Array<{ message?: string }>;
						[key: string]: unknown;
					};

					if (!response.ok) {
						return {
							content: [
								{
									type: "text",
									text: `Error: ${data.errors?.[0]?.message || "Failed to fetch Web Analytics"}`,
								},
							],
						};
					}

					return {
						content: [
							{
								type: "text",
								text: JSON.stringify(data.result || data, null, 2),
							},
						],
					};
				} catch (error) {
					return {
						content: [
							{
								type: "text",
								text: `Error fetching Web Analytics: ${error instanceof Error ? error.message : String(error)}`,
							},
						],
					};
				}
			},
		);

		// Cloudflare Zone - List zones
		this.server.tool(
			"cloudflare_list_zones",
			{
				api_token: z.string().describe("Cloudflare API token with Zone:Read permission"),
				name: z.string().optional().describe("Filter zones by name (optional)"),
			},
			async ({ api_token, name }) => {
				try {
					const path = name ? `/zones?name=${encodeURIComponent(name)}` : "/zones";
					const response = await cloudflareApiRequest(path, api_token);
					const data = (await response.json()) as {
						result?: Array<{
							id?: string;
							name?: string;
							status?: string;
							plan?: { name?: string };
							created_on?: string;
						}>;
						errors?: Array<{ message?: string }>;
					};

					if (!response.ok) {
						return {
							content: [
								{
									type: "text",
									text: `Error: ${data.errors?.[0]?.message || "Failed to list zones"}`,
								},
							],
						};
					}

					const zones = (data.result || []).map((zone) => ({
						id: zone.id,
						name: zone.name,
						status: zone.status,
						plan: zone.plan?.name,
						created: zone.created_on,
					}));

					return {
						content: [
							{
								type: "text",
								text: JSON.stringify(zones, null, 2),
							},
						],
					};
				} catch (error) {
					return {
						content: [
							{
								type: "text",
								text: `Error listing zones: ${error instanceof Error ? error.message : String(error)}`,
							},
						],
					};
				}
			},
		);
	}
}

export default {
	fetch(request: Request, env: Env, ctx: ExecutionContext) {
		const url = new URL(request.url);

		if (url.pathname === "/sse" || url.pathname === "/sse/message") {
			return MyMCP.serveSSE("/sse").fetch(request, env, ctx);
		}

		if (url.pathname === "/mcp") {
			return MyMCP.serve("/mcp").fetch(request, env, ctx);
		}

		return new Response("Not found", { status: 404 });
	},
};
