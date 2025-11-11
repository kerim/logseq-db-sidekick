import { LogseqBlockType } from '@/types/logseqBlock';
import LogseqPageLink from './LogseqPage';
import styles from './logseq.module.scss';
import React from 'react';

type LogseqBlockProps = {
  graph: string;
  blocks: LogseqBlockType[];
  isPopUp?: boolean;
};

export const LogseqBlock = ({ graph, blocks }: LogseqBlockProps) => {

  if (blocks.length === 0) {
    return <></>;
  }

  const block = blocks[0]; // TODO: randomyl picking first item - need to change later

  // Read-only status/marker display for DB graphs
  // In DB graphs, status is a property, not a marker in content
  const statusBadgeRender = (block: LogseqBlockType) => {
    // Prefer status from DB graph properties
    const displayStatus = block.status || block.marker;

    if (!displayStatus) {
      return <></>;
    }

    const isCompleted = displayStatus === 'DONE' ||
                        displayStatus === 'Done' ||
                        displayStatus === 'CANCELED' ||
                        displayStatus === 'Canceled';

    // Determine badge color based on status
    let badgeColor = 'gray';
    if (displayStatus === 'TODO' || displayStatus === 'Todo' || displayStatus === 'Backlog') {
      badgeColor = 'blue';
    } else if (displayStatus === 'DOING' || displayStatus === 'Doing') {
      badgeColor = 'orange';
    } else if (displayStatus === 'DONE' || displayStatus === 'Done') {
      badgeColor = 'green';
    } else if (displayStatus === 'CANCELED' || displayStatus === 'Canceled') {
      badgeColor = 'red';
    } else if (displayStatus === 'In Review' || displayStatus === 'REVIEW') {
      badgeColor = 'purple';
    }

    return (
      <div className={styles.blockMarker}>
        <input
          className={styles.blockMarkerCheckbox}
          type="checkbox"
          checked={isCompleted}
          disabled={true}
          readOnly={true}
        />
        <span
          className={styles.blockMarkerStatus}
          style={{
            backgroundColor: badgeColor,
            color: 'white',
            padding: '2px 6px',
            borderRadius: '3px',
            fontSize: '0.85em'
          }}
        >
          {displayStatus}
        </span>
      </div>
    );
  };

  // Render tags as badges (for DB graphs)
  const tagsBadgeRender = (block: LogseqBlockType) => {
    if (!block.tags || block.tags.length === 0) {
      return <></>;
    }

    return (
      <div style={{ display: 'flex', gap: '4px', marginLeft: '8px', flexWrap: 'wrap' }}>
        {block.tags.map((tag, index) => (
          <span
            key={index}
            style={{
              backgroundColor: '#e0e0e0',
              color: '#333',
              padding: '2px 6px',
              borderRadius: '3px',
              fontSize: '0.8em',
            }}
          >
            #{tag}
          </span>
        ))}
      </div>
    );
  };

  const toBlock = (block) => {
    if (!block.uuid) {
      return <></>
    }
    return <a
      className={styles.toBlock}
      href={`logseq://graph/${graph}?block-id=${block.uuid}`}
    >
      <span className={'tie tie-block'}></span>
      To Block
    </a>
  }

  if (block.html) {
    return (
      <div className={styles.block}>
        <div className={styles.blockHeader}>
          <LogseqPageLink graph={graph} page={block.page}></LogseqPageLink>
        </div>
        <div className={styles.blockBody}>
          <ul className={styles.blockContentList}>
            {blocks.map((block) => {
              // Show status badge for tasks (both DB and file-based)
              const hasStatus = block.marker != null || block.status != null;

              if (hasStatus) {
                return (
                  <li key={block.uuid} className={styles.blockContentListItem}>
                    <div className={styles.blockContentRoot} >
                      {statusBadgeRender(block)}
                      <div className={styles.blockContent} dangerouslySetInnerHTML={{ __html: block.html }} />
                      {tagsBadgeRender(block)}
                      {toBlock(block)}
                    </div>
                  </li>
                )
              }
              return (
                <li key={block.uuid} className={styles.blockContentListItem}>
                  <div className={styles.blockContentRoot} >
                    <div className={styles.blockContent} dangerouslySetInnerHTML={{ __html: block.html }} />
                    {tagsBadgeRender(block)}
                    {toBlock(block)}
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      </div>
    );
  }

  // For page results (no html content), just show the page link
  return (
    <div className={styles.block}>
      <div className={styles.blockHeader}>
        <LogseqPageLink graph={graph} page={block.page}></LogseqPageLink>
      </div>
    </div>
  );
};
