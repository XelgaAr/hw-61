import express from 'express';
import { configureSession } from './middleware/session.js';
import { handleError, recordRequest } from './middleware/http.js';
import { catalogRouter } from './routes/catalog.js';

export function createApp({
  log = console.log,
  readerPassword = process.env.READER_PASSWORD ?? 'reader-demo',
  editorPassword = process.env.EDITOR_PASSWORD ?? 'editor-demo',
  sessionSecret = process.env.SESSION_SECRET
} = {}) {
  const app = express();
  app.disable('x-powered-by');
  app.use(recordRequest(log));
  configureSession(app, { readerPassword, editorPassword, sessionSecret });
  app.get('/', (req, res) => res.send('Справочник редакции\n\nPOST /session — вход\nGET /users — пользователи\nGET /articles — статьи\nGET /session — текущая роль\nDELETE /session — выход'));
  app.use('/users', catalogRouter('users', 'userId'));
  app.use('/articles', catalogRouter('articles', 'articleId'));
  app.use((req, res) => res.status(404).send('Маршрут не найден.'));
  app.use(handleError);
  return app;
}
