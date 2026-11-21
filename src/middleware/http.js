import express from 'express';

export const readJson = [
  (req, res, next) => req.is('application/json') ? next() : res.status(415).send('Укажите Content-Type: application/json.'),
  express.json({ limit: '64kb' })
];

export const recordRequest = log => (req, res, next) => {
  const path = req.path;
  res.on('finish', () => log(`${new Date().toISOString()} ${req.method} ${path} ${res.statusCode}`));
  res.type('text/plain').set('Cache-Control', 'no-store');
  next();
};

export function handleError(err, req, res, next) {
  if (res.headersSent)
    return next(err);
  const code = err.status >= 400 && err.status < 600 ? err.status : 500;
  const messages = {
    400: 'Некорректный запрос. Проверьте JSON и адрес.',
    413: 'Слишком большой запрос.',
    415: 'Неподдерживаемый формат запроса.'
  };
  res.type('text/plain').status(code).send(messages[code] ?? 'Внутренняя ошибка сервера.');
}
