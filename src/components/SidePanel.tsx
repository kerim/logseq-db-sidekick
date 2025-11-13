import React, { useState } from 'react';
import { IconSettings, IconX } from '@tabler/icons-react';
import Browser from 'webextension-polyfill';
import LogseqSidekick from './LogseqSidekick';
import styles from './SidePanel.module.scss';

type SidePanelProps = {
  isOpen: boolean;
  onClose: () => void;
  graph: string;
  pages: any[];
  blocks: any[];
};

const SidePanel = ({
  isOpen,
  onClose,
  graph,
  pages,
  blocks,
}: SidePanelProps) => {
  const [searchQuery, setSearchQuery] = useState('');

  const goOptionPage = () => {
    Browser.runtime.sendMessage({ type: 'open-options' });
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement search functionality
    console.log('Search query:', searchQuery);
  };

  const count = pages.length + blocks.length;

  return (
    <>
      {/* Overlay */}
      <div
        className={`${styles.overlay} ${isOpen ? styles.visible : ''}`}
        onClick={onClose}
      />

      {/* Side Panel - always floating */}
      <div
        className={`${styles.sidePanel} ${styles.floating} ${isOpen ? styles.open : ''}`}
      >
        <div className={styles.panelHeader}>
          <div className={styles.panelHeaderTop}>
            <h2 className={styles.panelTitle}>
              Logseq Results {count > 0 && `(${count})`}
            </h2>
            <div className={styles.headerActions}>
              <IconSettings
                className={styles.iconButton}
                onClick={goOptionPage}
                size={20}
              />
              <IconX
                className={styles.closeButton}
                onClick={onClose}
                size={24}
              />
            </div>
          </div>

          <form onSubmit={handleSearchSubmit} className={styles.searchContainer}>
            <input
              type="text"
              className={styles.searchInput}
              placeholder="Search in Logseq..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <span className={styles.searchIcon}>🔍</span>
          </form>
        </div>

        <div className={styles.panelContent}>
          {graph ? (
            <LogseqSidekick graph={graph} blocks={blocks} pages={pages} />
          ) : (
            <div className={styles.emptyState}>
              <p>No results found. Configure your connection in settings.</p>
              <button onClick={goOptionPage} className={styles.configButton}>
                Open Settings
              </button>
            </div>
          )}
        </div>

        <div className={styles.panelFooter}>
          <span>
            <a href="https://github.com/kerim/logseq-db-sidekick/issues">
              Feedback
            </a>
          </span>
          <span>Logseq DB Sidekick</span>
        </div>
      </div>
    </>
  );
};

export default SidePanel;
