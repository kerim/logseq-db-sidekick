import { IconSettings } from '@tabler/icons-react';
import styles from './logseq.module.scss';
import Browser from 'webextension-polyfill';
import { LogseqBlock } from './LogseqBlock';
import LogseqPageLink from './LogseqPage';

const LogseqSidekick = ({ graph, pages, blocks }) => {
  console.log('[Logseq DB Sidekick] Rendering with:', { graph, pages, blocks });
  console.log('[Logseq DB Sidekick] Blocks length:', blocks?.length);
  console.log('[Logseq DB Sidekick] Pages length:', pages?.length);

  const goOptionPage = () => {
    Browser.runtime.sendMessage({ type: 'open-options' });
  };

  const groupedBlocks = blocks.reduce((groups, item) => {
    const group = (groups[item.page.name] || []);
    group.push(item);
    groups[item.page.name] = group;
    return groups;
  }, {});

  const count = () => {
    return pages.length + blocks.length;
  };

  const blocksRender = () => {
    if (blocks.length === 0) {
      return <></>;
    }
    return (
      <div className={styles.blocks}>
        {Object.entries(groupedBlocks).map(([key, blocks], i) => {
          return <LogseqBlock key={key} blocks={blocks} graph={graph} />;
        })}
      </div>
    );
  };

  const pagesRender = () => {
    if (pages.length === 0) {
      return <></>;
    }
    return <div className={styles.pages}>
      {pages.slice(0, 9).map((page) => {
        if (!page) return <></>;
        return (
          <div key={page.name} className={styles.page}>
            <LogseqPageLink
              graph={graph}
              page={page}
            ></LogseqPageLink>
          </div>
        );
      })}
    </div>

  };

  if (count() === 0) {
    return (
      <span>
        Nothing here, Do some research with Logseq!{' '}
        <a href={`logseq://graph/${graph}`}>Go</a>
      </span>
    );
  }

  return (
    <>
      <div className={styles.sidekickCardHeader}>
        <span>Graph: {graph}</span>
        <IconSettings onClick={goOptionPage} size={16} />
      </div>
      {pagesRender()}
      {blocksRender()}
    </>
  );
};

export default LogseqSidekick;
