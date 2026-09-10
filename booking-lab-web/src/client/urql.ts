import { createClient, cacheExchange, fetchExchange } from 'urql';

export const gqlClient = createClient({
  url: 'http://localhost:4000/graphql',
  exchanges: [cacheExchange, fetchExchange],
  requestPolicy: 'cache-and-network',
});
