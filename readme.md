# HeFeng Weather MCP Server

A Model Context Protocol server that provides weather forecast data for locations in China through HeFeng Weather API.

## Features

- Get real-time weather data
- Get hourly weather forecast (24h/72h/168h)
- Get daily weather forecast (3d/7d/10d/15d/30d)
- Support location query by longitude and latitude coordinates
- Full Chinese weather description
- JWT authentication support

## Configuration

This MCP server uses JWT authentication as required by HeFeng Weather API. You need to provide:

- `apiHost`: Your API host URL (e.g., https://your_api_host)
- `privateKey`: Your EdDSA private key
- `keyId`: Your key ID
- `projectId`: Your project ID

## API

This MCP server provides the following tool:

### get-weather

Get weather forecast data for a specific location.

# Usage with MCP Host(eg. Claude Desktop)

Add this to your claude_desktop_config.json

## NPX

```json
{
  "mcpServers": {
    "hefeng-weather": {
      "command": "npx",
      "args": ["hefeng-mcp-weather@latest", "--apiHost=${YOUR_API_HOST}", "--privateKey=${YOUR_PRIVATE_KEY}", "--keyId=${YOUR_KEY_ID}", "--projectId=${YOUR_PROJECT_ID}"]
    }
  }
}
```

## Local Development

```bash
# Install dependencies
pnpm install

# Build the project
pnpm run build

# Run with JWT authentication
node dist/index.js --apiHost="https://your_api_host" --privateKey="YOUR_PRIVATE_KEY" --keyId="YOUR_KEY_ID" --projectId="YOUR_PROJECT_ID"
```

# License

This MCP server is licensed under the MIT License. This means you are free to use, modify, and distribute the software, subject to the terms and conditions of the MIT License. For more details, please see the LICENSE file in the project repository.
