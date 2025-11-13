import Browser from 'webextension-polyfill';

export type LogseqSidekickConfig = {
  version: string;
  logseqHost: string;
  logseqHostName: string;
  logseqPort: number;
  logseqAuthToken: string;
  graphName: string;
  theme: 'auto' | 'light' | 'dark'; // Theme preference
};

export const getLogseqSidekickConfig =
  async (): Promise<LogseqSidekickConfig> => {
    const stored = await Browser.storage.local.get();
    console.log('[Config] Raw storage contents:', stored);

    const {
      version = '',
      logseqHost = 'http://localhost:8765',
      logseqHostName = 'localhost',
      logseqPort = 8765,
      logseqAuthToken = '',
      graphName = '',
      theme = 'auto',
    } = stored;

    const config = {
      version,
      logseqHost,
      logseqHostName,
      logseqPort,
      logseqAuthToken,
      graphName,
      theme,
    };

    console.log('[Config] Loaded config:', config);
    return config;
  };

export const saveLogseqSidekickConfig = async (
  updates: Partial<LogseqSidekickConfig>,
) => {
  console.log('saveLogseqSidekickConfig', updates);
  await Browser.storage.local.set(updates);
};
