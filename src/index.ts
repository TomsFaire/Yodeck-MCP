import 'dotenv/config';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createYodeckClient } from './client.js';
import { registerFolderTools } from './tools/folders.js';
import { registerLayoutTools } from './tools/layouts.js';
import { registerMediaTools } from './tools/media.js';
import { registerPlaylistTools } from './tools/playlists.js';
import { registerScreenTools } from './tools/screens.js';
import { registerScheduleTools } from './tools/schedules.js';
import { registerSemanticTools } from './tools/semantic.js';
import { registerWorkspaceTools } from './tools/workspaces.js';

const token = process.env.YODECK_API_TOKEN?.trim();
if (!token) {
  console.error(
    'Yodeck MCP: missing YODECK_API_TOKEN. Set it in the environment (or .env) and restart.',
  );
  process.exit(1);
}

const client = createYodeckClient(token);
const server = new McpServer(
  { name: 'yodeck-mcp', version: '1.0.0' },
  {
    instructions:
      'Yodeck digital signage API tools. Use list_* tools for paginated results (count, next, previous, results). Pass raw API bodies for create/update.',
  },
);

registerMediaTools(server, client);
registerPlaylistTools(server, client);
registerScheduleTools(server, client);
registerScreenTools(server, client);
registerWorkspaceTools(server, client);
registerLayoutTools(server, client);
registerFolderTools(server, client);
registerSemanticTools(server, client);

const transport = new StdioServerTransport();
await server.connect(transport);
