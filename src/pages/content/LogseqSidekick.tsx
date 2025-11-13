import React, { useState, useEffect } from 'react';
import { LogseqSearchResult } from '@/types/logseqBlock';
import { LogseqResponseType } from '../logseq/client';
import { getLogseqSidekickConfig } from '@/config';
import Browser from 'webextension-polyfill';
import FloatingButton from '@components/FloatingButton';
import SidePanel from '@components/SidePanel';
import '@/theme.scss';

type LogseqSidekickProps = {
  connect: Browser.Runtime.Port;
};

export const LogseqSidekickComponent = ({ connect }: LogseqSidekickProps) => {
  const [msg, setMsg] = React.useState('Loading...');
  const [logseqSearchResult, setLogseqSearchResult] =
    React.useState<LogseqSearchResult>();
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [theme, setTheme] = useState<'auto' | 'light' | 'dark'>('auto');
  const [graphName, setGraphName] = useState<string>('');

  // Load config and listen for changes
  useEffect(() => {
    const loadConfig = () => {
      getLogseqSidekickConfig().then((config) => {
        setTheme(config.theme);
        setGraphName(config.graphName || '');
        console.log('[Logseq DB Sidekick] Config loaded:', config);
      });
    };

    // Load initially
    loadConfig();

    // Listen for storage changes (when user updates settings)
    const handleStorageChange = (changes: any, areaName: string) => {
      console.log('[Logseq DB Sidekick] Storage changed:', JSON.stringify(changes), 'in area:', areaName);

      if (areaName === 'local' && changes.graphName) {
        const oldGraphName = changes.graphName.oldValue;
        const newGraphName = changes.graphName.newValue;
        console.log('[Logseq DB Sidekick] Graph changed from', oldGraphName, 'to', newGraphName);

        // Reload config to update UI state (button will change from ⚠️ to count)
        loadConfig();

        // Auto-retry removed! Cache invalidation in background script now handles
        // the config refresh. User can manually search again if desired.
      }

      if (areaName === 'local' && changes.theme) {
        console.log('[Logseq DB Sidekick] Theme changed, reloading config');
        loadConfig();
      }
    };

    Browser.storage.onChanged.addListener(handleStorageChange);

    return () => {
      Browser.storage.onChanged.removeListener(handleStorageChange);
    };
  }, []);

  // Apply theme
  useEffect(() => {
    console.log('[Logseq DB Sidekick] Setting theme:', theme);
    if (theme === 'auto') {
      document.documentElement.removeAttribute('data-theme');
    } else {
      document.documentElement.setAttribute('data-theme', theme);
    }
    console.log('[Logseq DB Sidekick] data-theme attribute:', document.documentElement.getAttribute('data-theme'));
  }, [theme]);

  // Prevent body scroll when panel is open
  useEffect(() => {
    if (isPanelOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    // Cleanup on unmount
    return () => {
      document.body.style.overflow = '';
    };
  }, [isPanelOpen]);

  // Calculate count for determining if we have results
  const graph = logseqSearchResult?.graph || '';
  const blocks = logseqSearchResult?.blocks || [];
  const pages = logseqSearchResult?.pages || [];
  const count = blocks.length + pages.length;

  // Handle incoming messages from background
  useEffect(() => {
    const messageListener = (resp: LogseqResponseType<LogseqSearchResult>) => {
      console.log('[Logseq DB Sidekick] Received response:', resp);
      setMsg(resp.msg);
      setLogseqSearchResult(resp.response);

      // Don't auto-open panel in floating mode - user must click button
      // Panel stays closed until user interaction
    };

    connect.onMessage.addListener(messageListener);

    return () => {
      connect.onMessage.removeListener(messageListener);
    };
  }, [connect]);

  const hasGraphConfigured = !!graphName;
  // Show button if: no graph (alert) OR graph configured (normal mode, show count even if 0)
  const showButton = true; // Always show - either alert icon or count

  // Handle button click - open settings if no graph configured, otherwise toggle panel
  const handleButtonClick = () => {
    console.log('[Logseq DB Sidekick] Button clicked!', {
      hasGraphConfigured,
      graphName,
      willOpenSettings: !hasGraphConfigured
    });

    if (!hasGraphConfigured) {
      console.log('[Logseq DB Sidekick] Opening settings page...');
      Browser.runtime.sendMessage({ type: 'open-options' });
    } else {
      console.log('[Logseq DB Sidekick] Toggling panel...');
      setIsPanelOpen(!isPanelOpen);
    }
  };

  console.log('[Logseq DB Sidekick] Render state:', {
    msg,
    count,
    isPanelOpen,
    hasGraphConfigured,
    graphName,
    showButton,
    hasResults: msg === 'success'
  });

  return (
    <>
      {/* Floating Button - show when no graph configured OR has results */}
      {showButton && (
        <FloatingButton
          count={count}
          isOpen={isPanelOpen}
          onClick={handleButtonClick}
          hasGraph={hasGraphConfigured}
        />
      )}

      {/* Side Panel - show when open and has results */}
      {count > 0 && (
        <SidePanel
          isOpen={isPanelOpen}
          onClose={() => setIsPanelOpen(false)}
          graph={graph}
          pages={pages}
          blocks={blocks}
        />
      )}
    </>
  );
};
