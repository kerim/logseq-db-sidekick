import Browser from 'webextension-polyfill';

export type LogseqSidekickConfig = {
  version: string;
  logseqHost: string;
  logseqHostName: string;
  logseqPort: number;
  logseqAuthToken: string;
  graphName: string;
  enableClipNoteFloatButton: boolean;
  clipNoteLocation: string;
  clipNoteCustomPage: string;
  clipNoteTemplate: string;
};

export const getLogseqSidekickConfig =
  async (): Promise<LogseqSidekickConfig> => {
    const {
      version = '',
      logseqHost = 'http://localhost:8765',
      logseqHostName = 'localhost',
      logseqPort = 8765,
      logseqAuthToken = '',
      graphName = '',
      enableClipNoteFloatButton = false,
      clipNoteLocation = "journal",
      clipNoteCustomPage = "",
      clipNoteTemplate = `#[[Clip]] [{{title}}]({{url}})
{{content}}`
    } = await Browser.storage.local.get();
    return {
      version,
      logseqHost,
      logseqHostName,
      logseqPort,
      logseqAuthToken,
      graphName,
      enableClipNoteFloatButton,
      clipNoteLocation,
      clipNoteCustomPage,
      clipNoteTemplate,
    };
  };

export const saveLogseqSidekickConfig = async (
  updates: Partial<LogseqSidekickConfig>,
) => {
  console.log('saveLogseqSidekickConfig', updates);
  await Browser.storage.local.set(updates);
};
