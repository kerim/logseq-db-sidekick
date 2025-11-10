import { getLogseqSidekickConfig, saveLogseqSidekickConfig } from "@/config";

export const changeOptionsHostToHostNameAndPort = async() => {
  const { logseqHost } = await getLogseqSidekickConfig();
  if (logseqHost) {
    const url = new URL(logseqHost);
    await saveLogseqSidekickConfig({
      logseqHostName: url.hostname,
      logseqPort: parseInt(url.port),
    });
    browser.storage.local.remove('logseqHost');
  }
}

