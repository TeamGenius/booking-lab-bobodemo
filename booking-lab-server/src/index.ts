import { createSchema, createYoga } from 'graphql-yoga';
import { createServer } from 'node:http';
import { typeDefs } from './schema.js';
import { resolvers } from './resolvers.js';

const yoga = createYoga({
  schema: createSchema({ typeDefs, resolvers }),
  graphqlEndpoint: '/graphql',
  landingPage: false,
  // Sandbox: surface underlying error messages so the UI can display them
  // (e.g. "Self-gift blocked", "Slot must be selected").
  maskedErrors: false,
  cors: {
    origin: ['http://localhost:5173'],
    credentials: true,
  },
});

const port = 4000;
const server = createServer(yoga);
server.listen(port, () => {
  console.log(`▶ Booking Lab server on http://localhost:${port}/graphql`);
});
