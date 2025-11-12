# Building a Remote MCP Server on Cloudflare (Without Auth)

This example allows you to deploy a remote MCP server that doesn't require authentication on Cloudflare Workers. This server includes Cloudflare observability tools for monitoring your websites and Workers.

## Get started: 

[![Deploy to Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/cloudflare/ai/tree/main/demos/remote-mcp-authless)

This will deploy your MCP server to a URL like: `remote-mcp-server-authless.<your-account>.workers.dev/sse`

Alternatively, you can use the command line below to get the remote MCP Server created on your local machine:
```bash
npm create cloudflare@latest -- my-mcp-server --template=cloudflare/ai/demos/remote-mcp-authless
```

## Running Locally

You can run this MCP server locally for development and testing:

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start the development server:**
   ```bash
   npm run dev
   # or
   npm start
   ```

   Your MCP server will be running at `http://localhost:8787/`

3. **Test with MCP Inspector:**
   ```bash
   npx @modelcontextprotocol/inspector
   ```
   
   In the inspector:
   - Set Transport Type to `SSE`
   - Enter `http://localhost:8787/sse` as the server URL
   - Click "Connect"

4. **Connect from Claude Desktop:**
   Use the [mcp-remote proxy](https://www.npmjs.com/package/mcp-remote) in your Claude Desktop config:
   ```json
   {
     "mcpServers": {
       "cloudflare-mcp": {
         "command": "npx",
         "args": [
           "mcp-remote",
           "http://localhost:8787/sse"
         ]
       }
     }
   }
   ```

## Available Tools

### Calculator Tools
- `add` - Simple addition
- `calculate` - Calculator with multiple operations (add, subtract, multiply, divide)

### Cloudflare Observability Tools

#### Zone Analytics
- **`cloudflare_zone_analytics`** - Get analytics summary for a Cloudflare zone
  - Returns: total requests, bandwidth, unique visitors, threats blocked, page views
  - Parameters: `zone_id`, `api_token`, `since` (optional), `until` (optional)

- **`cloudflare_zone_analytics_timeseries`** - Get time series analytics data
  - Returns: Detailed time series data with requests, bandwidth, visitors, threats over time
  - Parameters: `zone_id`, `api_token`, `since` (optional), `until` (optional)

#### Zone Management
- **`cloudflare_list_zones`** - List all zones in your account
  - Returns: Zone IDs, names, status, plan, and creation dates
  - Parameters: `api_token`, `name` (optional filter)

#### Workers Analytics
- **`cloudflare_workers_analytics`** - Query Workers Analytics Engine
  - Execute SQL-like queries against your Workers Analytics Engine datasets
  - Parameters: `account_id`, `api_token`, `dataset` (optional), `query`

#### Web Analytics
- **`cloudflare_web_analytics`** - Get Web Analytics data for a site
  - Returns: Web Analytics statistics for your site
  - Parameters: `account_id`, `site_tag`, `api_token`, `start` (optional), `end` (optional)

## Getting Cloudflare API Tokens

To use the Cloudflare observability tools, you'll need API tokens with appropriate permissions:

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/profile/api-tokens)
2. Click "Create Token"
3. Use "Edit zone DNS" template or create a custom token with:
   - **Zone Analytics:Read** - For zone analytics tools
   - **Zone:Read** - For listing zones
   - **Account Analytics:Read** - For Workers and Web Analytics
4. Copy the token (you'll only see it once!)

### Finding Your Zone ID and Account ID

- **Zone ID**: Found in your Cloudflare dashboard under your domain's overview page
- **Account ID**: Found in the right sidebar of your Cloudflare dashboard

## Example Usage

### Get Zone Analytics
```
Tool: cloudflare_zone_analytics
Parameters:
  - zone_id: "your-zone-id"
  - api_token: "your-api-token"
  - since: "2024-01-01T00:00:00Z" (optional)
  - until: "2024-01-31T23:59:59Z" (optional)
```

### List Your Zones
```
Tool: cloudflare_list_zones
Parameters:
  - api_token: "your-api-token"
  - name: "example.com" (optional)
```

### Query Workers Analytics
```
Tool: cloudflare_workers_analytics
Parameters:
  - account_id: "your-account-id"
  - api_token: "your-api-token"
  - query: "SELECT * FROM dataset LIMIT 10"
  - dataset: "default" (optional)
```

## Customizing your MCP Server

To add your own [tools](https://developers.cloudflare.com/agents/model-context-protocol/tools/) to the MCP server, define each tool inside the `init()` method of `src/index.ts` using `this.server.tool(...)`. 

## Connect to Cloudflare AI Playground

You can connect to your MCP server from the Cloudflare AI Playground, which is a remote MCP client:

1. Go to https://playground.ai.cloudflare.com/
2. Enter your deployed MCP server URL (`remote-mcp-server-authless.<your-account>.workers.dev/sse`)
3. You can now use your MCP tools directly from the playground!

## Connect Claude Desktop to your MCP server

You can also connect to your remote MCP server from local MCP clients, by using the [mcp-remote proxy](https://www.npmjs.com/package/mcp-remote). 

To connect to your MCP server from Claude Desktop, follow [Anthropic's Quickstart](https://modelcontextprotocol.io/quickstart/user) and within Claude Desktop go to Settings > Developer > Edit Config.

Update with this configuration:

```json
{
  "mcpServers": {
    "cloudflare-mcp": {
      "command": "npx",
      "args": [
        "mcp-remote",
        "http://localhost:8787/sse"  // or remote-mcp-server-authless.your-account.workers.dev/sse
      ]
    }
  }
}
```

Restart Claude and you should see the tools become available. 
