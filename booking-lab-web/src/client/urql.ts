import { createClient, cacheExchange, fetchExchange } from 'urql';
import { localGraphqlFetch } from '../mock/localGraphql';

const GRAPHQL_URL =
  (import.meta.env.VITE_GRAPHQL_URL as string | undefined) ??
  'http://localhost:4000/graphql';

// When no external endpoint is configured, run the schema in-browser so the
// app is fully static (GitHub Pages friendly). Any real URL uses network fetch.
const useLocalMock =
  !import.meta.env.VITE_GRAPHQL_URL || import.meta.env.VITE_GRAPHQL_URL === 'mock';

export const gqlClient = createClient({
  url: useLocalMock ? '/graphql' : GRAPHQL_URL,
  exchanges: [cacheExchange, fetchExchange],
  fetch: useLocalMock ? localGraphqlFetch : undefined,
  requestPolicy: 'cache-and-network',
});
