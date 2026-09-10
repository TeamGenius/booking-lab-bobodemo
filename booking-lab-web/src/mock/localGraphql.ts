import { execute, parse, type ExecutionResult, type GraphQLError } from 'graphql';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { resolvers } from './resolvers';
import { typeDefs } from './schema';

// Executable schema built from the same typeDefs + resolvers the standalone
// graphql-yoga server uses. Runs entirely in the browser — no network hop.
const schema = makeExecutableSchema({ typeDefs, resolvers: resolvers as never });

type GraphQLRequest = {
  query: string;
  variables?: Record<string, unknown>;
  operationName?: string;
};

// urql calls fetch(url, init). We only need init.body — url is ignored.
export async function localGraphqlFetch(
  _input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const body = typeof init?.body === 'string' ? init.body : '{}';
  let req: GraphQLRequest;
  try {
    req = JSON.parse(body);
  } catch {
    return new Response(JSON.stringify({ errors: [{ message: 'Invalid JSON' }] }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    });
  }

  let result: ExecutionResult;
  try {
    result = await execute({
      schema,
      document: parse(req.query),
      variableValues: req.variables,
      operationName: req.operationName,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    result = { errors: [{ message } as unknown as GraphQLError] };
  }

  return new Response(JSON.stringify(result), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}
