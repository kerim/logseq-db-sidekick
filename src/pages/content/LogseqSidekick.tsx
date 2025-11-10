import React from 'react';
import { LogseqSearchResult } from '@/types/logseqBlock';
import { LogseqResponseType } from '../logseq/client';
import Browser from 'webextension-polyfill';
import styles from './index.module.scss';
import LogseqSidekick from '@components/LogseqSidekick';
type LogseqSidekickProps = {
  connect: Browser.Runtime.Port;
};

export const LogseqSidekickComponent = ({ connect }: LogseqSidekickProps) => {
  const [msg, setMsg] = React.useState('Loading...');
  const [logseqSearchResult, setLogseqSearchResult] =
    React.useState<LogseqSearchResult>();

  connect.onMessage.addListener(
    (resp: LogseqResponseType<LogseqSearchResult>) => {
      console.log('[Logseq DB Sidekick] Received response:', resp);
      console.log('[Logseq DB Sidekick] Response msg:', resp.msg);
      console.log('[Logseq DB Sidekick] Response data:', resp.response);
      setMsg(resp.msg);
      setLogseqSearchResult(resp.response);
    },
  );

  const goOptionPage = () => {
    Browser.runtime.sendMessage({ type: 'open-options' });
  };

  const statusShower = () => {
    if (msg === 'success') {
      return (
        <LogseqSidekick
          graph={logseqSearchResult?.graph || ''}
          blocks={logseqSearchResult?.blocks || []}
          pages={logseqSearchResult?.pages || []}
        />
      );
    } else if (msg !== 'Loading') {
      return (
        <button className={styles.configIt} onClick={goOptionPage}>
          Config it
        </button>
      );
    }
    return <></>;
  };

  return (
    <div className={styles.sidekick}>
      <div className={styles.sidekickBody}>{statusShower()}</div>

      <div className={styles.sidekickFooter}>
        <span>
          <a href="https://github.com/kerim/logseq-db-sidekick/issues">Feedback</a>
        </span>
        <span>
          Logseq DB Sidekick
        </span>
      </div>
    </div>
  );
};
