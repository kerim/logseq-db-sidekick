abstract class SearchingEngine {
  isMatch(): boolean {
    return false;
  }
  getQuery(): string | null {
    return null;
  }
  gotElement(): Element {
    // Universal fixed-position container
    // Works for both floating button and sidebar modes

    // Check if container already exists
    let container = document.getElementById('logseq-sidekick-root');
    if (container) {
      console.log('[Logseq DB Sidekick] Reusing existing container');
      return container;
    }

    console.log('[Logseq DB Sidekick] Creating new container');
    container = document.createElement('div');
    container.id = 'logseq-sidekick-root';
    container.style.position = 'fixed';
    container.style.top = '0';
    container.style.right = '0';
    container.style.zIndex = '9999';
    container.style.pointerEvents = 'none'; // Allow clicks through to page

    // All children will need to re-enable pointer events
    container.style.cssText = `
      position: fixed;
      top: 0;
      right: 0;
      z-index: 9999;
      pointer-events: none;
    `;

    document.body.appendChild(container);
    console.log('[Logseq DB Sidekick] Container appended to body');
    return container;
  }
  reload(callback: Function): null {
    return null;
  }
}

export class Google extends SearchingEngine {
  isMatch(): boolean {
    const match = window.location.hostname.match(
      /\.google(\.com?)?(\.\w{2})?(\.cat)?$/g,
    );
    return !!match;
  }

  getQuery(): string | null {
    const searchURL = new URL(window.location.href);
    const query = searchURL.searchParams.get('q');
    return query;
  }
}

export class Ecosia extends SearchingEngine {
  isMatch(): boolean {
    const match = window.location.hostname.match(/ecosia\.org$/g);
    return !!match;
  }

  getQuery(): string | null {
    const searchURL = new URL(window.location.href);
    const query = searchURL.searchParams.get('q');
    return query;
  }
}

export class Bing extends SearchingEngine {
  isMatch(): boolean {
    const match = window.location.hostname.match(/bing(\.com)?(\.\w{2})?$/g);
    return !!match;
  }

  getQuery(): string | null {
    const searchURL = new URL(window.location.href);
    const query = searchURL.searchParams.get('q');
    return query;
  }
}

export class DuckDuckGo extends SearchingEngine {
  isMatch(): boolean {
    const match = window.location.hostname.match(/duckduckgo\.com$/g);
    return !!match;
  }

  getQuery(): string | null {
    const searchURL = new URL(window.location.href);
    const query = searchURL.searchParams.get('q');
    return query;
  }
}

export class Yandex extends SearchingEngine {
  isMatch(): boolean {
    const match = window.location.hostname.match(/yandex\.(com|ru)$/);
    return !!match;
  }

  getQuery(): string | null {
    const searchURL = new URL(window.location.href);
    const query = searchURL.searchParams.get('text');
    return query;
  }
}

export class SearX extends SearchingEngine {
  isMatch(): boolean {
    // Check if the website is using the searx engine
    const meta = document.querySelector('head > meta[name="generator"]');
    if (meta && meta.getAttribute('content')?.includes('searxng')) {
      return true;
    }
    // Check if the website is using the searx engine
    const match = !!window.location.hostname.match(/^searx(ng)?\./);
    return !!match;
  }

  getQuery(): string | null {
    const searchUrlDom = document.getElementById('search_url');
    if (searchUrlDom) {
      const searchUrl = new URL(
        searchUrlDom.getElementsByTagName('pre')[0].innerHTML,
      );
      return searchUrl.searchParams.get('q');
    }

    const searchUrl = new URL(window.location.href);
    const query = searchUrl.searchParams.get('q');

    return query;
  }
}

export class Baidu extends SearchingEngine {
  isMatch(): boolean {
    const match = !!window.location.hostname.match('baidu.com');
    return !!match;
  }

  getQuery(): string | null {
    const searchUrl = new URL(window.location.href);
    const query = searchUrl.searchParams.get('wd');
    return query;
  }

  reload(callback: Function): null {
    const targetNode = document.getElementById('wrapper_wrapper');
    if (!targetNode) return null;

    const observer = new MutationObserver(function (records) {
      for (const record of records) {
        if (record.type === 'childList') {
          for (const node of record.addedNodes) {
            if ('id' in node && node.id === 'container') {
              callback();
              return null;
            }
          }
        }
      }
    });
    observer.observe(targetNode, { childList: true });
    return null;
  }
}

export class Kagi extends SearchingEngine {
  isMatch(): boolean {
    const match = window.location.hostname.match(/kagi\.com$/g);
    return !!match;
  }

  getQuery(): string | null {
    const searchUrl = new URL(window.location.href);
    const query = searchUrl.searchParams.get('q');
    return query;
  }

  reload(callback: Function): null {
    // Watch for URL changes (Kagi uses client-side routing)
    let lastQuery = this.getQuery();

    const observer = new MutationObserver(() => {
      const currentQuery = this.getQuery();
      if (currentQuery !== lastQuery) {
        lastQuery = currentQuery;
        callback();
      }
    });

    // Watch the main content area for changes
    const targetNode = document.querySelector('main#main');
    if (targetNode) {
      observer.observe(targetNode, {
        childList: true,
        subtree: true
      });
    }

    return null;
  }
}

export class Startpage extends SearchingEngine {
  isMatch(): boolean {
    const match = window.location.hostname.match(/startpage\.com$/g);
    return !!match;
  }

  getQuery(): string | null {
    const query = document.querySelector('#q')?.getAttribute('value') || null;
    return query;
  }
}

const searchEngins = [
  new Google(),
  new Ecosia(),
  new Bing(),
  new DuckDuckGo(),
  new Yandex(),
  new SearX(),
  new Kagi(),
  new Baidu(),
  new Startpage(),
];

export default searchEngins;
