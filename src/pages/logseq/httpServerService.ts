import { LogseqBlockType } from '../../types/logseqBlock';
import HttpServerClient from './httpServerClient';
import { renderBlock } from './tool';
import { LogseqServiceInterface } from './interfaces';

export default class HttpServerService implements LogseqServiceInterface {
  public client: HttpServerClient = new HttpServerClient();

  public async getGraph() {
    const graph = await this.client.getGraph();
    return graph.name.replace('logseq_db_', '');
  }

  public async showMsg(message: string) {
    return await this.client.showMsg(message);
  }

  public async getVersion() {
    const version = await this.client.getVersion();
    return version.response || 'HTTP Server Mode';
  }

  private async searchGraph(graphName: string, query: string) {
    const resp = await this.client.search(query);
    const response = {
      blocks: [],
      pages: [],
      count: 0,
      graph: graphName,
    };

    // Use pages directly from search response - server now returns pages, not blocks
    if (resp.blocks) {
      response.blocks = resp.blocks
        .filter((item: any) => !item['page?'])
        .map((item: any) => {
          // Return page results without rendering - just show page links
          return item;
        });
    }

    return response;
  }

  public async search(query: string) {
    const graph = await this.getGraph();
    console.debug(`HTTP Server Graph Name: ${graph}`);
    const resp = {
      msg: 'success',
      status: 200,
      response: await this.searchGraph(graph, query),
    };
    return resp;
  }

  public async getBlock(
    blockUuid: string,
    graph: string,
    query?: string,
    includeChildren: boolean = false,
  ) {
    const block = await this.client.getBlockViaUuid(blockUuid, {
      includeChildren,
    });

    // The HTTP server client already transforms the block data
    // We just need to render it
    return renderBlock(block, graph, query);
  }

  public async urlSearch(url: URL, opt: { fuzzy: boolean } = { fuzzy: false }) {
    const graph = await this.getGraph();
    const blockUuidSet = new Set();
    const blocks: LogseqBlockType[] = [];

    const blockAdd = (block: LogseqBlockType) => {
      if (blockUuidSet.has(block.uuid)) {
        return;
      }
      blockUuidSet.add(block.uuid);
      blocks.push(block);
    };

    const find = async (url: string) => {
      const results = await this.searchGraph(graph, url);
      results.blocks.forEach(blockAdd);
    };

    if (url.pathname) {
      await find(url.host + url.pathname);
    }

    const count = blocks.length;

    if (url.host && opt.fuzzy) {
      await find(url.host);
    }

    return {
      status: 200,
      msg: 'success',
      response: {
        blocks: blocks.map((block) => {
          return renderBlock(block, graph, url.href);
        }),
        graph: graph,
      },
      count: count,
    };
  }

  // changeBlockMarker is removed because HTTP server is read-only
  public async changeBlockMarker(uuid: string, marker: string) {
    console.warn('changeBlockMarker is not supported in HTTP server mode (read-only)');
    return {
      type: 'change-block-marker-result',
      uuid: uuid,
      status: 'failed',
      msg: 'Not supported in HTTP server mode (read-only)',
    };
  }
}
