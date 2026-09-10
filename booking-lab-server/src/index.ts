import { createSchema, createYoga } from 'graphql-yoga';
import { createServer } from 'node:http';
import { typeDefs } from './schema.js';
import { resolvers } from './resolvers.js';

// CORS_ORIGINS is a comma-separated list; '*' allows any origin (demo only).
const corsOrigins = (process.env.CORS_ORIGINS ?? 'http://localhost:5173')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

const yoga = createYoga({
  schema: createSchema({ typeDefs, resolvers }),
  graphqlEndpoint: '/graphql',
  landingPage: false,
  // Sandbox: surface underlying error messages so the UI can display them
  // (e.g. "Self-gift blocked", "Slot must be selected").
  maskedErrors: false,
  cors: {
    origin: corsOrigins.includes('*') ? '*' : corsOrigins,
    credentials: true,
  },
});

const port = Number(process.env.PORT ?? 4000);
const server = createServer(yoga);
server.listen(port, () => {
  console.log(`▶ Booking Lab server on http://localhost:${port}/graphql`);
});
