import MiniSearch from 'minisearch';
import { useCallback, useEffect, useState } from 'react';

export type DocRecord = {
  id: string;
  repo: string;
  path: string;
  title: string;
  kind: 'doc' | 'code' | 'other';
  url: string;
  text: string;
};

type IndexPayload = {
  built: string;
  records: DocRecord[];
  truncated: boolean;
};

type IndexState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ready'; index: MiniSearch<DocRecord>; payload: IndexPayload }
  | { status: 'empty'; reason: string }
  | { status: 'error'; error: string };

let _cached: IndexState | null = null;

function baseUrl() {
  const b = import.meta.env.BASE_URL ?? '/';
  return b.endsWith('/') ? b : b + '/';
}

export function useDocsIndex() {
  const [state, setState] = useState<IndexState>(_cached ?? { status: 'idle' });

  const load = useCallback(async () => {
    if (_cached && _cached.status !== 'idle') return;
    _cached = { status: 'loading' };
    setState(_cached);
    try {
      const res = await fetch(baseUrl() + 'docs-index.json');
      if (!res.ok) throw new Error(`docs-index.json HTTP ${res.status}`);
      const payload = (await res.json()) as IndexPayload;
      if (!payload.records || payload.records.length === 0) {
        _cached = {
          status: 'empty',
          reason:
            'Index is empty. Rebuild with `npm run docs:index` from a checkout that has HPH.Core.API + HPH.Admin.Web as siblings.',
        };
        setState(_cached);
        return;
      }
      const mini = new MiniSearch<DocRecord>({
        idField: 'id',
        fields: ['title', 'text', 'path'],
        storeFields: ['repo', 'path', 'title', 'kind', 'url', 'text'],
        searchOptions: {
          boost: { title: 3, path: 1.5 },
          fuzzy: 0.15,
          prefix: true,
        },
      });
      mini.addAll(payload.records);
      _cached = { status: 'ready', index: mini, payload };
      setState(_cached);
    } catch (err) {
      _cached = { status: 'error', error: (err as Error).message };
      setState(_cached);
    }
  }, []);

  useEffect(() => {
    if (_cached && _cached.status !== 'idle') {
      setState(_cached);
    }
  }, []);

  return { state, load };
}
