import { getLogseqSidekickConfig } from '@/config';
import { fixDuckDuckGoDark } from '@/utils';
import { createRoot } from 'react-dom/client';
import Browser from 'webextension-polyfill';
import { LogseqSidekickComponent } from './LogseqSidekick';
import mountQuickCapture from './QuickCapture';
import searchEngines, {
  Baidu,
  Bing,
  Ecosia,
  DuckDuckGo,
  Google,
  SearX,
  Yandex,
} from './searchingEngines/searchingEngines';

const connect = Browser.runtime.connect();

console.log('[Logseq DB Sidekick] Connection established:', connect);

connect.onDisconnect.addListener(() => {
  console.error('[Logseq DB Sidekick] Connection disconnected!', Browser.runtime.lastError);
});

const mount = async (container: Element, query: string) => {
  const root = createRoot(container);

  console.log('[Logseq DB Sidekick] Sending query to background:', query);
  console.log('[Logseq DB Sidekick] Connection state:', connect);

  try {
    connect.postMessage({ type: 'query', query: query });
    console.log('[Logseq DB Sidekick] Message sent successfully');
  } catch (error) {
    console.error('[Logseq DB Sidekick] Error sending message:', error);
  }

  root.render(<LogseqSidekickComponent connect={connect} />);
};

async function run(
  searchEngine: Google | Bing | Ecosia | DuckDuckGo | Yandex | SearX | Baidu,
) {
  console.debug('Logseq DB Sidekick', window.location.hostname);

  if (searchEngine instanceof DuckDuckGo) {
    fixDuckDuckGoDark()
  }

  const query = searchEngine.getQuery();
  if (query) {
    console.log(`match ${typeof searchEngine}, query ${query}`);
    const container = await searchEngine.gotElement();
    await mount(container, query);
  }
}

function getEngine() {
  for (const engine of searchEngines) {
    if (engine.isMatch()) {
      return engine;
    }
  }
}

const searchEngine = getEngine();

if (searchEngine) {
  setTimeout(() => run(searchEngine), 200);
  if (searchEngine.reload) {
    searchEngine.reload(() => run(searchEngine));
  }
}

getLogseqSidekickConfig().then(({ enableClipNoteFloatButton }) => {
  if (!enableClipNoteFloatButton) return;
  mountQuickCapture();
});
