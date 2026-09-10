import { createClient, cacheExchange, fetchExchange } from 'urql';

const GRAPHQL_URL =
  (import.meta.env.VITE_GRAPHQL_URL as string | undefined) ??
  'http://localhost:4000/graphql';

export const gqlClient = createClient({
  url: GRAPHQL_URL,
  exchanges: [cacheExchange, fetchExchange],
  requestPolicy: 'cache-and-network',
});
