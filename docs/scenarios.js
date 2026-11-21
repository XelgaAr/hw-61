export const scenarios = [
  { id: 'root', title: 'Открытие сервера', path: '/', role: 'Гость', expected: 200,
    note: 'Корневой маршрут открыт для всех. Сервер записывает метод, путь и результат запроса в журнал.' },
  { id: 'private', title: 'Запрос без сессии', path: '/users', role: 'Гость', expected: 401,
    note: 'Список пользователей доступен после входа. Этот запрос отправлен без сессионной cookie.' },
  { id: 'login', title: 'Вход читателя', method: 'POST', path: '/session', role: 'Гость', expected: 200,
    body: { username: 'reader', password: 'reader-demo' },
    note: 'После проверки учебных учётных данных сервер создаёт сессию. Браузер сохраняет её идентификатор в HttpOnly-cookie.' },
  { id: 'users', title: 'Список пользователей', path: '/users', role: 'Читатель', expected: 200,
    note: 'Читатель вошёл в систему. Middleware проверяет сессию и передаёт запрос контроллеру пользователей.' },
  { id: 'article', title: 'Чтение статьи', path: '/articles/1', role: 'Читатель', expected: 200,
    note: 'Роль читателя даёт доступ к карточке статьи. Контроллер возвращает запись с указанным ID.' },
  { id: 'forbidden', title: 'Проверка прав на запись', method: 'POST', path: '/articles', role: 'Читатель', expected: 403,
    body: { title: 'Заметка', content: 'Материал к публикации.' },
    note: 'Читатель может открывать статьи. Для публикации требуется сессия редактора.' },
  { id: 'publish', title: 'Публикация статьи', method: 'POST', path: '/articles', role: 'Редактор', expected: 201,
    body: { title: 'Заметка', content: 'Материал к публикации.' },
    note: 'Тот же запрос с ролью редактора создаёт статью. В ответе возвращается ID новой записи.' },
  { id: 'invalid', title: 'Проверка данных', method: 'POST', path: '/users', role: 'Редактор', expected: 400,
    body: { name: 'Ирина', email: 'invalid' },
    note: 'Редактору доступна запись. Middleware отклоняет адрес электронной почты с неверным форматом.' },
  { id: 'missing', title: 'Поиск по ID', path: '/articles/900000', role: 'Редактор', expected: 404,
    note: 'Идентификатор прошёл валидацию. Статья с таким номером отсутствует в учебной коллекции.' }
];

export async function runScenario(base, scenario, send = fetch) {
  const request = (path, method = 'GET', body) => send(base + path, {
    method, credentials: scenario.role === 'Гость' && scenario.id !== 'login' ? 'omit' : 'same-origin',
    ...(body && { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  });
  const username = { 'Читатель': 'reader', 'Редактор': 'editor' }[scenario.role];
  if (username) {
    const login = await request('/session', 'POST', { username, password: username + '-demo' });
    if (!login.ok)
      throw new Error('Не удалось открыть учебную сессию.');
  }
  const response = await request(scenario.path, scenario.method, scenario.body);
  return { status: response.status, phrase: response.statusText, type: response.headers.get('content-type'), text: await response.text() };
}
