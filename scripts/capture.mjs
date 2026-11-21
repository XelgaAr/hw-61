import { once } from 'node:events';
import { writeFile } from 'node:fs/promises';
import { createApp } from '../src/app.js';
import { scenarios, runScenario } from '../docs/scenarios.js';

const app = createApp({ readerPassword: 'reader-demo', editorPassword: 'editor-demo', log: () => {} });
const server = app.listen(0, '127.0.0.1');
try {
  await once(server, 'listening');
  const base = 'http://127.0.0.1:' + server.address().port;
  const snapshots = {};
  for (const scenario of scenarios) {
    let cookie;
    const send = async (url, options) => {
      const headers = new Headers(options.headers);
      if (cookie)
        headers.set('Cookie', cookie);
      const response = await fetch(url, { ...options, headers });
      const session = response.headers.getSetCookie()[0];
      if (session)
        cookie = session.split(';')[0];
      return response;
    };
    const result = await runScenario(base, scenario, send);
    if (result.status !== scenario.expected || !result.type?.startsWith('text/plain'))
      throw new Error(scenario.id + ' → ' + result.status + ' ' + result.type);
    snapshots[scenario.id] = result;
  }
  await writeFile(new URL('../docs/responses.json', import.meta.url), JSON.stringify(snapshots, null, 2).replaceAll('\n', '\r\n') + '\r\n');
  console.log('Сохранены ответы Express: ' + scenarios.length);
} finally {
  await new Promise(resolve => server.close(resolve));
}
