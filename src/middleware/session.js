import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import session from 'express-session';
import { readJson } from './http.js';

const cookieName = 'hw61.sid';
const hash = value => createHash('sha256').update(value).digest();

export function configureSession(app, { readerPassword, editorPassword, sessionSecret }) {
  const passwords = new Map([['reader', hash(readerPassword)], ['editor', hash(editorPassword)]]);
  app.use(session({
    name: cookieName,
    secret: sessionSecret ?? randomBytes(32).toString('hex'),
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 30 * 60_000, httpOnly: true, sameSite: 'lax', secure: 'auto' }
  }));
  app.post('/session', readJson, (req, res, next) => {
    const { username, password } = req.body ?? {};
    if (typeof username !== 'string' || typeof password !== 'string' || !username || !password)
      return res.status(400).send('Укажите username и password.');
    const expected = passwords.get(username);
    if (!expected || !timingSafeEqual(hash(password), expected))
      return res.status(401).send('Неверное имя или пароль.');
    req.session.regenerate(err => {
      if (err)
        return next(err);
      req.session.role = username;
      res.send(`Вход выполнен. Роль: ${username}.`);
    });
  });
  app.get('/session', authenticated, (req, res) => res.send(`Текущая роль: ${req.session.role}.`));
  app.delete('/session', authenticated, (req, res, next) => {
    req.session.destroy(err => {
      if (err)
        return next(err);
      res.clearCookie(cookieName, { httpOnly: true, sameSite: 'lax' }).send('Сеанс завершён.');
    });
  });
}

export function authenticated(req, res, next) {
  return req.session.role ? next() : res.status(401).send('Для доступа войдите через POST /session.');
}

export function mayEdit(req, res, next) {
  return req.session.role === 'editor' ? next() : res.status(403).send('Для изменений нужна роль editor.');
}
