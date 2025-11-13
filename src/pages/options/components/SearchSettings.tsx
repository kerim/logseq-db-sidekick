import {
  Heading,
  Grid,
  Text,
  RadioGroup,
  Stack,
  Radio,
} from '@chakra-ui/react';
import React, { useEffect } from 'react';

import {
  getLogseqSidekickConfig,
  saveLogseqSidekickConfig,
  LogseqSidekickConfig,
} from '@/config';

export const SearchSettings = () => {
  const [logseqConfig, setLogseqConfig] = React.useState<LogseqSidekickConfig>();

  useEffect(() => {
    getLogseqSidekickConfig().then((config) => {
      setLogseqConfig(config);
    });
  }, []);

  const handleThemeChange = async (value: string) => {
    const newValue = value as 'auto' | 'light' | 'dark';
    setLogseqConfig({
      ...logseqConfig,
      theme: newValue,
    });
    await saveLogseqSidekickConfig({ theme: newValue });
  };

  return (
    <>
      <Heading size={'lg'}>Display Settings</Heading>
      <Grid gridTemplateColumns={'200px 1fr'} rowGap={4} alignItems={'start'}>
        <Text fontSize="md" mt={2}>Theme</Text>
        <div>
          <RadioGroup
            value={logseqConfig?.theme || 'auto'}
            onChange={handleThemeChange}
          >
            <Stack spacing={3} direction="column">
              <Radio value="auto">Auto (follow system)</Radio>
              <Radio value="light">Light</Radio>
              <Radio value="dark">Dark</Radio>
            </Stack>
          </RadioGroup>
          <Text fontSize="xs" color="gray.600" mt={2}>
            Choose your preferred color theme. Auto mode matches your browser's system preference.
          </Text>
        </div>
      </Grid>
    </>
  );
};
