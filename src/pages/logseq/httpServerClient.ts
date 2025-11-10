import { LogseqBlockType, LogseqPageIdenity } from '../../types/logseqBlock';
import {
  CannotConnectWithLogseq,
  NoSearchingResult,
  UnknownIssues,
} from './error';
import { LogseqClientInterface } from './interfaces';
import { getLogseqSidekickConfig } from '../../config';

type Graph = {
  name: string;
  path: string;
};

type HttpServerResponse = {
  success: boolean;
  stdout: string;
  stderr: string;
  returncode: number;
  data?: any;
};

type LogseqSearchResponse = {
  blocks: {
    'block/uuid': string;
    'block/content': string;
    'block/page': number;
  }[];
  'pages-content': {
    'block/uuid': string;
    'block/snippet': string;
  }[];
  pages: string[];
};

export type LogseqResponseType<T> = {
  status: number;
  msg: string;
  response: T;
  count?: number;
};

export default class HttpServerClient implements LogseqClientInterface {
  private serverUrl: string = '';
  private graphName: string = '';

  private async getConfig() {
    if (!this.serverUrl) {
      const config = await getLogseqSidekickConfig();
      this.serverUrl = config.logseqHost || 'http://localhost:8765';
      this.graphName = config.graphName || '';
    }
    return { serverUrl: this.serverUrl, graphName: this.graphName };
  }

  private async httpFetch(endpoint: string, options?: RequestInit): Promise<HttpServerResponse> {
    const { serverUrl } = await this.getConfig();
    const url = `${serverUrl}${endpoint}`;

    try {
      const resp = await fetch(url, {
        mode: 'cors',
        ...options,
      });

      if (!resp.ok) {
        throw new Error(`HTTP ${resp.status}: ${resp.statusText}`);
      }

      const data = await resp.json();
      return data;
    } catch (e: any) {
      console.error('HTTP Server fetch error:', e);
      throw e;
    }
  }

  private async catchIssues<T>(func: () => Promise<T>): Promise<T | typeof CannotConnectWithLogseq | typeof UnknownIssues> {
    try {
      return await func();
    } catch (e: any) {
      console.error('HTTP Server error:', e);
      if (
        e.toString() === 'TypeError: Failed to fetch' ||
        e.toString().includes('Invalid URL')
      ) {
        return CannotConnectWithLogseq;
      } else if (e === NoSearchingResult) {
        return e;
      } else {
        return UnknownIssues;
      }
    }
  }

  public async getGraph(): Promise<Graph> {
    return await this.catchIssues(async () => {
      const { graphName } = await this.getConfig();
      // Get graph info using the show endpoint
      const resp = await this.httpFetch(`/show?graph=${encodeURIComponent(graphName)}`);

      if (resp.success && resp.data) {
        return {
          name: graphName,
          path: resp.data.path || '',
        };
      }

      // Fallback if data not available
      return {
        name: graphName,
        path: '',
      };
    }) as Promise<Graph>;
  }

  public async search(query: string): Promise<LogseqSearchResponse> {
    return await this.catchIssues(async () => {
      const { graphName } = await this.getConfig();
      const endpoint = `/search?q=${encodeURIComponent(query)}&graph=${encodeURIComponent(graphName)}`;

      console.log('[HTTP Server Client] Searching:', { query, graphName, endpoint });
      const resp = await this.httpFetch(endpoint);
      console.log('[HTTP Server Client] Search response:', resp);

      if (!resp.success) {
        console.error('[HTTP Server Client] Search failed:', resp);
        throw NoSearchingResult;
      }

      // Parse the datalog query results from HTTP server
      // Server now returns structured data from logseq query command
      if (resp.data) {
        console.log('[HTTP Server Client] Search data:', resp.data);

        // resp.data is an array of blocks from datalog query:
        // [{block/uuid: "...", block/title: "...", block/page: {db/id, block/uuid, block/title, block/name}}]
        const blocks = Array.isArray(resp.data) ? resp.data : [];

        // Transform to LogseqSearchResponse format matching LogseqBlockType interface
        const transformed = {
          blocks: blocks.map((block: any) => {
            const page = block['block/page'] || {};
            const transformedBlock = {
              uuid: block['block/uuid'] || block.uuid || '',
              content: block['block/title'] || '', // DB graphs use title
              page: {
                id: page['db/id'] || 0,
                uuid: page['block/uuid'] || '',
                name: page['block/title'] || page['block/name'] || 'Unknown Page',
                originalName: page['block/name'] || '',
              },
              html: '', // Will be set by renderBlock
              format: 'markdown',
              marker: '',
              priority: '',
            };
            console.log('[HTTP Server Client] Transformed block:', JSON.stringify(transformedBlock, null, 2));
            return transformedBlock;
          }),
          'pages-content': [],
          pages: [],
        };
        console.log('[HTTP Server Client] Final response:', JSON.stringify(transformed, null, 2));
        return transformed;
      }

      console.warn('[HTTP Server Client] No data in search response');
      throw NoSearchingResult;
    }) as Promise<LogseqSearchResponse>;
  }

  private parseSearchOutput(output: string): LogseqSearchResponse {
    // Parse the text output from logseq CLI search command
    // This is a basic parser - adjust based on actual output format
    const blocks: any[] = [];
    const pages: string[] = [];

    // Try to parse as JSON first (if CLI returns JSON)
    try {
      const parsed = JSON.parse(output);
      if (Array.isArray(parsed)) {
        return {
          blocks: parsed.map(item => ({
            'block/uuid': item.uuid || item['block/uuid'],
            'block/content': item.content || item['block/content'],
            'block/page': item.page || item['block/page'],
          })),
          'pages-content': [],
          pages: [],
        };
      }
    } catch (e) {
      // Not JSON, continue with text parsing
    }

    // Return empty result if parsing fails
    return {
      blocks: [],
      'pages-content': [],
      pages: [],
    };
  }

  public async getBlockViaUuid(
    uuid: string,
    opt?: { includeChildren: boolean }
  ): Promise<LogseqBlockType> {
    return await this.catchIssues(async () => {
      const { graphName } = await this.getConfig();

      // Use datalog query to get block by UUID with all properties
      // Pull pattern includes all relevant attributes for both DB and file-based graphs
      const query = `{:query [:find (pull ?b [:block/uuid
                                                :block/content
                                                :block/format
                                                :block/marker
                                                :block/priority
                                                :block/properties
                                                :block/tags
                                                :block/page
                                                :logseq.property/status
                                                :logseq.property/priority
                                                {:block/page [:db/id :block/uuid :block/name :block/title]}
                                                {:block/tags [:block/title]}
                                                {:logseq.property/status [:block/title]}
                                                {:logseq.property/priority [:block/title]}])
                              :where [?b :block/uuid #uuid "${uuid}"]]}`;

      const resp = await this.httpFetch('/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          graph: graphName,
          query: query,
        }),
      });

      if (!resp.success || !resp.data) {
        throw new Error('Block not found');
      }

      // Transform the datalog response to LogseqBlockType
      const blockData = resp.data[0]?.[0];
      if (!blockData) {
        throw new Error('Block not found');
      }

      return this.transformBlockData(blockData);
    }) as Promise<LogseqBlockType>;
  }

  private transformBlockData(blockData: any): LogseqBlockType {
    // Extract DB graph properties
    const properties = blockData['block/properties'] || {};

    // Extract status from logseq.property/status (DB graph format)
    let status: string | undefined = undefined;
    if (blockData['logseq.property/status']) {
      status = blockData['logseq.property/status']['block/title'] ||
               blockData['logseq.property/status'];
    }

    // Extract tags (DB graph format)
    let tags: string[] = [];
    if (blockData['block/tags']) {
      tags = blockData['block/tags'].map((tag: any) =>
        tag['block/title'] || tag
      );
    }

    // Extract priority from logseq.property/priority (DB graph format)
    let priority: string | undefined = undefined;
    if (blockData['logseq.property/priority']) {
      priority = blockData['logseq.property/priority']['block/title'] ||
                 blockData['logseq.property/priority'];
    }

    // For DB graphs, there's no marker in content - use status instead
    // For file-based graphs, use the actual marker
    const marker = blockData['block/marker'] ||
                   (status ? this.mapStatusToMarker(status) : undefined);

    return {
      uuid: blockData['block/uuid'] || blockData.uuid || '',
      content: blockData['block/content'] || blockData.content || '',
      marker: marker,
      priority: priority || blockData['block/priority'] || undefined,
      page: {
        id: blockData['block/page']?.['db/id'] || blockData['block/page'] || 0,
        name: blockData['block/page']?.['block/name'] || blockData['block/page']?.['block/title'] || '',
        uuid: blockData['block/page']?.['block/uuid'] || '',
      },
      format: blockData['block/format'] || 'markdown',
      html: '',
      properties: properties,
      tags: tags,
      status: status,
    };
  }

  // Map DB graph status to traditional marker for backward compatibility
  private mapStatusToMarker(status: string): string {
    const statusMap: Record<string, string> = {
      'Todo': 'TODO',
      'Doing': 'DOING',
      'Done': 'DONE',
      'Canceled': 'CANCELED',
      'In Review': 'REVIEW',
      'Backlog': 'LATER',
    };
    return statusMap[status] || status.toUpperCase();
  }

  public async isDBGraph(): Promise<boolean> {
    // The HTTP server works with both DB and file-based graphs
    // We can try to determine the type from the graph info
    return await this.catchIssues(async () => {
      const { graphName } = await this.getConfig();
      const resp = await this.httpFetch(`/show?graph=${encodeURIComponent(graphName)}`);

      // Check if the response indicates a DB graph
      // This is a heuristic - adjust based on actual HTTP server response format
      if (resp.data && resp.data.type) {
        return resp.data.type === 'db';
      }

      // Default to true (assume DB graph)
      return true;
    }) as Promise<boolean>;
  }

  // Methods that are not supported by the HTTP server
  // These will return mock responses or throw errors

  public async appendBlock(page: string, content: string): Promise<any> {
    throw new Error('appendBlock is not supported by HTTP server (read-only)');
  }

  public async getVersion(): Promise<any> {
    // Return a mock version response
    return {
      status: 200,
      msg: 'success',
      response: 'HTTP Server Mode',
    };
  }

  public async updateBlock(block: LogseqBlockType): Promise<any> {
    throw new Error('updateBlock is not supported by HTTP server (read-only)');
  }

  public async getAllPages(): Promise<any> {
    // This could be implemented with a datalog query if needed
    throw new Error('getAllPages is not yet implemented for HTTP server');
  }

  public async showMsg(message: string): Promise<any> {
    // Use health check to verify server is running
    // This is called by the connection check in the UI
    try {
      await this.checkHealth();
      console.log('HTTP Server is running:', message);
      return {
        status: 200,
        msg: 'success',
        response: null,
      };
    } catch (e: any) {
      console.error('HTTP Server health check failed:', e);
      return {
        status: 500,
        msg: e.message || 'Cannot connect to HTTP server',
        response: null,
      };
    }
  }

  // Check if HTTP server is running
  public async checkHealth(): Promise<boolean> {
    try {
      const resp = await this.httpFetch('/health');
      return resp.success && resp.status === 'healthy';
    } catch (e) {
      throw new Error('HTTP server is not running or not accessible');
    }
  }

  public async getUserConfig(): Promise<any> {
    // Return empty config
    return {};
  }
}
