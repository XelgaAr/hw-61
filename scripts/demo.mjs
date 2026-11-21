import express from 'express';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { createApp } from '../src/app.js';

const docs = new URL('../docs/', import.meta.url);
const server = express();
server.enable('strict routing');
const html = (await readFile(new URL('index.html', docs), 'utf8')).replace('data-mode="static"', 'data-mode="live"');
server.get('/demo', (_req, res) => res.redirect('/demo/'));
server.get('/demo/', (_req, res) => res.type('html').send(html));
server.use('/demo/', express.static(fileURLToPath(docs)));
server.use(createApp({ readerPassword: 'reader-demo', editorPassword: 'editor-demo' }));
const port = Number(process.env.DEMO_PORT ?? 4173);
const listener = server.listen(port, '127.0.0.1', () => {
  console.log('http://localhost:' + listener.address().port + '/demo/');
});
