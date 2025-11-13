import {
  Flex,
  Container,
  Heading,
  Text,
  Link,
  Divider,
} from '@chakra-ui/react';
import { LogseqConnectOptions } from './components/Connect';
import { SearchSettings } from './components/SearchSettings';
import styles from './Options.module.scss';

const Options = () => {
  return (
    <Container className={styles.options} maxW={'56rem'} mt={'1rem'}>
      <Flex direction={'row'}>
        <Flex direction={'column'} w={'16rem'}>
          <Heading>Logseq DB Sidekick</Heading>
          <Text>
            <Link
              href={`https://github.com/kerim/logseq-db-sidekick/releases/tag/${process.env.VERSION}`}
            >
              {process.env.VERSION}
            </Link>
          </Text>
        </Flex>
        <Flex direction={'column'} w={'40rem'} gap={2}>
          <LogseqConnectOptions />

          <Divider />

          <SearchSettings />
        </Flex>
      </Flex>
    </Container>
  );
};

export default Options;
