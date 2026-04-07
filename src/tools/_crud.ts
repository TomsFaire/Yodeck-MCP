import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { YodeckClient } from '../client.js';
import { toolJsonResult } from '../result.js';

const listParamsShape = {
  limit: z
    .number()
    .int()
    .positive()
    .max(500)
    .optional()
    .describe('Page size (default 100). Full envelope: count, next, previous, results.'),
  offset: z.number().int().min(0).optional().describe('Pagination offset'),
  workspace: z.number().int().optional().describe('Filter by workspace ID'),
};

const idParam = z.union([z.number().int(), z.string()]).describe('Resource ID');

const bodyRecord = z
  .record(z.string(), z.unknown())
  .describe('JSON object sent to the Yodeck API');

export type CrudDefinition = {
  path: string;
  tools: {
    list: string;
    get: string;
    create: string;
    update: string;
    delete: string;
  };
};

export function registerYodeckCrud(
  server: McpServer,
  client: YodeckClient,
  def: CrudDefinition,
): void {
  const { path, tools } = def;
  const plural = path.replace(/\/?$/, '');

  server.registerTool(
    tools.list,
    {
      description: `List ${plural} with optional limit, offset, and workspace filter. Returns the raw pagination envelope from the API.`,
      inputSchema: listParamsShape,
    },
    async (args) => {
      const data = await client.list(path, {
        limit: args.limit,
        offset: args.offset,
        workspace: args.workspace,
      });
      return toolJsonResult(data);
    },
  );

  server.registerTool(
    tools.get,
    {
      description: `Get one ${plural} resource by ID. Returns raw API JSON.`,
      inputSchema: { id: idParam },
    },
    async (args) => {
      const data = await client.get(path, args.id);
      return toolJsonResult(data);
    },
  );

  server.registerTool(
    tools.create,
    {
      description: `Create a ${plural} entry (POST). Body is passed through to the API (URL-based media in Phase 1).`,
      inputSchema: { body: bodyRecord },
    },
    async (args) => {
      const data = await client.post(path, args.body);
      return toolJsonResult(data);
    },
  );

  server.registerTool(
    tools.update,
    {
      description: `Update a resource by ID (PATCH). Body fields are passed through to the API.`,
      inputSchema: { id: idParam, body: bodyRecord },
    },
    async (args) => {
      const data = await client.patch(path, args.id, args.body);
      return toolJsonResult(data);
    },
  );

  server.registerTool(
    tools.delete,
    {
      description: `Delete a resource by ID.`,
      inputSchema: { id: idParam },
    },
    async (args) => {
      await client.delete(path, args.id);
      return toolJsonResult({ ok: true, id: args.id });
    },
  );
}
