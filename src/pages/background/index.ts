import { browser } from '@/browser';
import { getLogseqSidekickConfig } from '../../config';
import { blockRending, versionCompare } from './utils';
import { debounce } from '@/utils';
import { format } from 'date-fns';
import { changeOptionsHostToHostNameAndPort } from './upgrade';
import {getLogseqService} from '@pages/logseq/tool';

console.log('[Logseq DB Sidekick] Background script loaded');

// Listen for storage changes and invalidate cache when config is updated
browser.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'local') {
    // Check if any config values changed (graphName, hostname, or port)
    if (changes.graphName || changes.logseqHostName || changes.logseqPort) {
      console.log('[Logseq DB Sidekick] Config changed, clearing HTTP client cache');
      console.log('[Logseq DB Sidekick] Changed keys:', Object.keys(changes));

      // Clear the cache so next search will reload config
      getLogseqService().then((service) => {
        service.client.clearCache();
      }).catch((err) => {
        console.error('[Logseq DB Sidekick] Failed to clear cache:', err);
      });
    }
  }
});

browser.runtime.onConnect.addListener((port) => {
  console.log('[Logseq DB Sidekick] Port connected:', port);
  port.onMessage.addListener((msg) => {
    if (msg.type === 'query') {
      console.log('[Logseq DB Sidekick] Received query:', msg.query);
      const promise = new Promise(async () => {
        try {
          console.log('[Logseq DB Sidekick] Getting service...');
          const logseqService = await getLogseqService();
          console.log('[Logseq DB Sidekick] Searching...');
          const searchRes = await logseqService.search(msg.query);
          console.log('[Logseq DB Sidekick] Search result:', searchRes);
          port.postMessage(searchRes);
        } catch (error) {
          console.error('[Logseq DB Sidekick] Error during search:', error);

          let errorMsg = 'Search failed';

          // If it's a Response object, try to get more details
          if (error instanceof Response) {
            const errorText = await error.text().catch(() => 'Could not read error text');
            console.error('[Logseq DB Sidekick] Error response status:', error.status);
            console.error('[Logseq DB Sidekick] Error response text:', errorText);
            errorMsg = `HTTP error ${error.status}`;
          } else if (error instanceof Error) {
            errorMsg = error.message;
          }

          // Provide helpful message if server is not running
          if (errorMsg.includes('Failed to fetch') || errorMsg.includes('NetworkError')) {
            errorMsg = 'HTTP server is not running. Start it with: python3 logseq_server.py';
          }

          port.postMessage({
            status: 500,
            msg: errorMsg,
            response: null
          });
        }
      });

      promise.catch((err) => console.error('[Logseq DB Sidekick] Promise error:', err));
    } else if (msg.type === 'open-options') {
      browser.runtime.openOptionsPage();
    } else {
      console.debug(msg);
    }
  });
});

browser.runtime.onMessage.addListener((msg, sender) => {
  console.log('[Logseq DB Sidekick] Runtime message received:', msg);

  if (msg.type === 'open-options') {
    console.log('[Logseq DB Sidekick] Opening options page...');
    browser.runtime.openOptionsPage();
  } else if (msg.type === 'clip-with-selection') {
    quickCapture(msg.data);
  } else if (msg.type === 'clip-page') {
    quickCapture('');
  } else if (msg.type === 'open-page') {
    openPage(msg.url);
  } else {
    console.debug(msg);
  }
});

const getCurrentTab = async () => {
  const tab = await browser.tabs.query({ active: true, currentWindow: true });
  return tab[0];
};

const openPage = async (url: string) => {
  console.debug(url);
  const tab = await getCurrentTab();
  if (!tab) {
    browser.tabs.create({ url: url });
    return;
  }
  const activeTab = tab;
  if (activeTab.url !== url)
    await browser.tabs.update(activeTab.id, { url: url });
};

const quickCapture = async (data: string) => {
  const tab = await getCurrentTab();
  if (!tab) return;
  const activeTab = tab;
  const { clipNoteLocation, clipNoteCustomPage, clipNoteTemplate } =
    await getLogseqSidekickConfig();
  const now = new Date();
  const logseqService = await getLogseqService();

  const resp = await logseqService.client.getUserConfig();

  const block = blockRending({
    url: activeTab.url,
    title: activeTab.title,
    data,
    clipNoteTemplate,
    preferredDateFormat: resp['preferredDateFormat'],
    time: now,
  });

  if (clipNoteLocation === 'customPage') {
    await logseqService.client.appendBlock(clipNoteCustomPage, block);
  } else if (clipNoteLocation === 'currentPage') {
    const { name: currentPage } = await logseqService.client.getCurrentPage();
    await logseqService.client.appendBlock(currentPage, block);
  } else {
    const journalPage = format(now, resp['preferredDateFormat']);
    await logseqService.client.appendBlock(journalPage, block);
  }

  debounceBadgeSearch(activeTab.url, activeTab.id!);
};

browser.tabs.onActivated.addListener((activeInfo) => {
  const promise = new Promise(async () => {
    const tab = await browser.tabs.get(activeInfo.tabId);
    await debounceBadgeSearch(tab.url, activeInfo.tabId);
  });
  promise.catch((err) => console.error(err));
});

browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (tab.active && changeInfo.status === 'complete') {
    const promise = new Promise(async () => {
      await debounceBadgeSearch(tab.url, tabId);
    });
    promise.catch((err) => console.error(err));
  }
});

const badgeSearch = async (url: string | undefined, tabId: number) => {
  if (!url) return;
  const searchURL = new URL(url);
  const logseqService = await getLogseqService();
  const searchRes = await logseqService.urlSearch(searchURL);
  const resultCount = searchRes.count ? searchRes.count!.toString() : '';
  await setExtensionBadge(resultCount, tabId);
};

const debounceBadgeSearch = debounce(badgeSearch, 1000);

try {
  browser.contextMenus.create({
    id: 'clip-with-selection',
    title: 'Clip "%s"',
    visible: true,
    contexts: ['selection'],
  });
} catch (error) {
  console.log(error);
}

try {
  browser.contextMenus.create({
    id: 'clip-page',
    title: 'Clip page link',
    visible: true,
    contexts: ['page'],
  });
} catch (error) {
  console.log(error);
}

browser.contextMenus.onClicked.addListener((info, tab) => {
  browser.tabs.sendMessage(tab!.id!, { type: info.menuItemId }, {});
});

browser.runtime.onInstalled.addListener((event) => {
  if (event.reason === 'install') {
    browser.runtime.openOptionsPage();
  } else if (event.reason === 'update') {
    if (versionCompare(event.previousVersion!, '1.10.19') < 0) {
      changeOptionsHostToHostNameAndPort();
    }
  }
});

browser.commands.onCommand.addListener((command, tab) => {
  if (command === 'clip' && tab !== undefined) {
    browser.tabs.sendMessage(tab.id!, { type: 'clip' });
  }
});

async function setExtensionBadge(text: string, tabId: number) {
  await browser.action.setBadgeText({
    text: text,
    tabId: tabId,
  });
  await browser.action.setBadgeBackgroundColor({ color: '#4caf50', tabId });
  await browser.action.setBadgeTextColor({ color: '#ffffff', tabId });
}
