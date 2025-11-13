import {
  Heading,
  Grid,
  Text,
  Input,
  InputGroup,
  InputRightElement,
  Button,
  Link,
  NumberInput,
  NumberInputField,
  Select,
} from '@chakra-ui/react';
import React, { useEffect } from 'react';

import {
  getLogseqSidekickConfig,
  saveLogseqSidekickConfig,
  LogseqSidekickConfig,
} from '@/config';
import { getLogseqService } from '@pages/logseq/tool';

export const LogseqConnectOptions = () => {
  const [init, setInit] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [connected, setConnected] = React.useState(false);
  const [buttonMessage, setButtonMessage] = React.useState('Connect');
  const [showToken, setShowToken] = React.useState(false);
  const [logseqConfig, setLogseqConfig] = React.useState<LogseqSidekickConfig>();
  const [availableGraphs, setAvailableGraphs] = React.useState<string[]>([]);
  const [loadingGraphs, setLoadingGraphs] = React.useState(false);

  const onChange = async (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    console.log('[Connect] onChange called:', e.target.name, '=', e.target.value);
    const newConfig = {
      ...logseqConfig,
      [e.target.name]: e.target.value,
    };
    setLogseqConfig(newConfig);

    // Auto-save the field that changed
    await saveLogseqSidekickConfig({
      [e.target.name]: e.target.value,
    });
    console.log('[Connect] Auto-saved field:', e.target.name);
  };

  const changeLogseqPort = async (port: string) => {
    if (port === '' || parseInt(port) < 0) {
      port = '0'
    }
    const portNum = parseInt(port);
    setLogseqConfig({
      ...logseqConfig,
      logseqPort: portNum,
    });
    // Auto-save port
    await saveLogseqSidekickConfig({
      logseqPort: portNum,
    });
  }

  const triggerShowToken = () => setShowToken(!showToken);

  const save = () => {
    try {
      // new URL(logseqConfig!.logseqHost);
    } catch (error) {
      setConnected(false);
      setButtonMessage('HTTP Server Host is not a URL!');
      return;
    }

    const promise = new Promise(async () => {
      await saveLogseqSidekickConfig({
        logseqAuthToken: logseqConfig!.logseqAuthToken,
        logseqHostName: logseqConfig?.logseqHostName,
        logseqPort: logseqConfig?.logseqPort,
        graphName: logseqConfig?.graphName,
      });
      await checkConnection();
      // Don't open Logseq - we're using HTTP server, not the Logseq app
    });
    promise.then(console.log).catch(console.error);
  };

  const loadGraphs = async () => {
    setLoadingGraphs(true);
    try {
      const { logseqHostName, logseqPort } = logseqConfig || { logseqHostName: 'localhost', logseqPort: 8765 };
      const url = `http://${logseqHostName}:${logseqPort}/list`;
      const response = await fetch(url);
      const data = await response.json();

      if (data.success) {
        // Parse graph names from output
        const lines = data.stdout.split('\n');
        const graphNames = lines
          .filter((line: string) => line.trim() && !line.includes(':') &&
                  line.trim() !== 'DB Graphs' && line.trim() !== 'File Graphs')
          .map((line: string) => line.trim());

        setAvailableGraphs(graphNames);
      }
    } catch (error) {
      console.error('Failed to load graphs:', error);
    } finally {
      setLoadingGraphs(false);
    }
  };

  useEffect(() => {
    if (!init) {
      getLogseqSidekickConfig().then((config) => {
        console.log('inti');
        setLogseqConfig(config);
        setInit(true);
        if (config.logseqAuthToken === '') {
          setLoading(false);
          return;
        }
        const promise = new Promise(async () => {
          await checkConnection();
          // Load available graphs after connection check
          await loadGraphs();
        });
        promise.then(console.log).catch(console.error);
      });
    }
  });

  const checkConnection = async (): Promise<boolean> => {
    setLoading(true);
    const service = await getLogseqService();
    const resp = await service.showMsg('Logseq DB Sidekick HTTP Connect!');
    const connectStatus = resp.msg === 'success';
    setConnected(connectStatus);
    if (connectStatus) {
      const version = await service.getVersion();
      setButtonMessage(`Connected to HTTP Server (${version})!`);
    } else {
      setConnected(false);
      // Provide helpful error message
      const errorMsg = resp.msg || 'Connection failed';
      if (errorMsg.includes('not running') || errorMsg.includes('not accessible')) {
        setButtonMessage('HTTP Server not running. Start it with: python3 logseq_server.py');
      } else {
        setButtonMessage(errorMsg);
      }
    }
    setLoading(false);
    return connectStatus;
  };

  return (
    <>
      <Heading size={'lg'}>Logseq HTTP Server Connect</Heading>
      <Grid
        gridTemplateColumns={'1fr 1fr 1fr'}
        alignItems={'center'}
        rowGap={2}
        columnGap={2}
      >
        <Text gridColumn={'1 / span 2'} fontSize="sm">
          HTTP Server Host
        </Text>
        <Text fontSize="sm">Port (1 ~ 65535)</Text>
        <Input
          gridColumn={'1 / span 2'}
          name="logseqHostName"
          placeholder="localhost"
          onChange={onChange}
          value={logseqConfig?.logseqHostName}
        />
        <NumberInput
          max={65535}
          min={1}
          name="logseqPort"
          placeholder="8765"
          onChange={changeLogseqPort}
          value={logseqConfig?.logseqPort}
        >
          <NumberInputField />
        </NumberInput>
        <Text gridColumn={'1 / span 2'} fontSize="sm">
          Graph Name
        </Text>
        <Button
          size="sm"
          onClick={loadGraphs}
          isLoading={loadingGraphs}
          isDisabled={!logseqConfig?.logseqHostName}
        >
          Refresh Graphs
        </Button>
        {availableGraphs.length > 0 ? (
          <Select
            gridColumn={'1 / span 3'}
            name="graphName"
            placeholder="-- Select a graph --"
            onChange={onChange}
            value={logseqConfig?.graphName}
          >
            {availableGraphs.map((graph) => (
              <option key={graph} value={graph}>
                {graph}
              </option>
            ))}
          </Select>
        ) : (
          <Input
            gridColumn={'1 / span 3'}
            name="graphName"
            placeholder="my-graph (or click Refresh Graphs)"
            onChange={onChange}
            value={logseqConfig?.graphName}
          />
        )}
        <Text gridColumn={'1 / span 3'} fontSize="xs" color="gray.500">
          Note: The HTTP server does not require an authorization token. Leave the field below empty.
        </Text>
        <Text gridColumn={'1 / span 3'} fontSize="xs" color="blue.600" fontWeight="medium">
          ⚠️ Make sure the HTTP server is running first: python3 logseq_server.py
        </Text>
        <Button
          gridColumn={'1 / span 3'}
          onClick={save}
          variant="outline"
          colorScheme={!connected ? 'red' : 'green'}
          isLoading={loading}
        >
          {buttonMessage}
        </Button>
        <Text gridColumn={'1 / span 3'} justifySelf={'end'}>
          <Link
            color={!connected ? 'red' : undefined}
            href="https://github.com/kerim/logseq-http-server"
          >
            HTTP Server Setup Guide
          </Link>
        </Text>
      </Grid>
    </>
  );
};
