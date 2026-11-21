import assert from 'node:assert/strict';
import { once } from 'node:events';
import test from 'node:test';
import { createApp } from '../src/app.js';

async function fixture(t) {
  const log = [];
  const server = createApp({
    log: line => log.push(line),
    readerPassword: 'reader-demo',
    editorPassword: 'editor-demo'
  }).listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => new Promise((resolve, reject) => server.close(err => err ? reject(err) : resolve())));
  async function request(path, status, { method, cookie, body, raw, contentType } = {}) {
    const headers = {};
    if (cookie)
      headers.cookie = cookie;
    if (body !== undefined || raw !== undefined)
      headers['content-type'] = contentType ?? 'application/json';
    const response = await fetch(`http://127.0.0.1:${server.address().port}${path}`, {
      method, headers, body: raw ?? JSON.stringify(body)
    });
    const text = await response.text();
    assert.equal(response.status, status, `${method ?? 'GET'} ${path}: ${text}`);
    assert.match(response.headers.get('content-type'), /^text\/plain\b.*utf-8/i);
    return { text, location: response.headers.get('location'), cookieHeader: response.headers.get('set-cookie') };
  }
  async function login(username, previousCookie) {
    const { cookieHeader } = await request('/session', 200, {
      method: 'POST', cookie: previousCookie, body: { username, password: `${username}-demo` }
    });
    assert.match(cookieHeader, /HttpOnly/);
    assert.match(cookieHeader, /SameSite=Lax/);
    return cookieHeader.split(';')[0];
  }
  return { request, login, log };
}

test('Главная страница и журнал завершённых запросов', async t => {
  const { request, log } = await fixture(t);
  const { text, cookieHeader } = await request('/?source=browser', 200);
  assert.match(text, /\/articles/);
  assert.equal(cookieHeader, null);
  assert.match(log[0], /Z GET \/ 200$/);
  await request('/missing', 404);
  assert.match(log[1], /GET \/missing 404$/);
});

test('Идентификация, смена роли и уничтожение сеанса', async t => {
  const { request, login } = await fixture(t);
  for (const path of ['/session', '/users', '/users/1', '/articles', '/articles/1'])
    await request(path, 401);
  await request('/articles', 401, { method: 'POST', raw: '{' });
  await request('/session', 400, { method: 'POST', body: {} });
  await request('/session', 401, { method: 'POST', body: { username: 'editor', password: 'incorrect' } });
  const reader = await login('reader');
  assert.match((await request('/session', 200, { cookie: reader })).text, /reader/);
  const editor = await login('editor', reader);
  assert.notEqual(reader, editor);
  await request('/users', 401, { cookie: reader });
  assert.match((await request('/session', 200, { cookie: editor })).text, /editor/);
  const { cookieHeader } = await request('/session', 200, { method: 'DELETE', cookie: editor });
  assert.match(cookieHeader, /hw61\.sid=;/);
  await request('/users', 401, { cookie: editor });
});

test('Читатель видит данные, но не изменяет ресурсы', async t => {
  const { request, login } = await fixture(t);
  const cookie = await login('reader');
  for (const path of ['/users', '/articles']) {
    await request(path, 200, { cookie });
    const before = await request(path + '/1', 200, { cookie });
    await request(path, 403, { cookie, method: 'POST', body: {} });
    for (const method of ['PUT', 'PATCH', 'DELETE'])
      await request(path + '/1', 403, { cookie, method, body: {} });
    assert.equal((await request(path + '/1', 200, { cookie })).text, before.text);
  }
});

for (const [resource, initial, patch, replacement, unchanged] of [
  ['users', { name: 'Алиса', email: 'alice@example.org', age: 22 }, { name: 'Ирина' }, { name: 'Мария', email: 'maria@example.org' }, 'alice@example.org'],
  ['articles', { title: 'Архитектура MVC', content: 'Три слоя' }, { title: 'Express' }, { title: 'Сессии', content: 'Хранение данных' }, 'Три слоя']
]) {
  test(`Полный цикл CRUD: ${resource}`, async t => {
    const { request, login } = await fixture(t);
    const cookie = await login('editor');
    const path = '/' + resource;
    const created = await request(path, 201, { cookie, method: 'POST', body: initial });
    assert.match(created.location, new RegExp(`^/${resource}/[1-9][0-9]*$`));
    const address = created.location;
    assert.ok((await request(path, 200, { cookie })).text.includes(created.text));
    assert.equal((await request(address, 200, { cookie })).text, created.text);
    const patched = await request(address, 200, { cookie, method: 'PATCH', body: patch });
    assert.ok(patched.text.includes(Object.values(patch)[0]) && patched.text.includes(unchanged));
    const replaced = await request(address, 200, { cookie, method: 'PUT', body: replacement });
    assert.ok(Object.values(replacement).every(value => replaced.text.includes(value)));
    assert.ok(!replaced.text.includes(unchanged) && !replaced.text.includes('Возраст:'));
    await request(address, 200, { cookie, method: 'DELETE' });
    await request(address, 404, { cookie });
    await request(address, 404, { cookie, method: 'PATCH', body: patch });
  });
}

test('Проверка ID, структуры и размеров тела запроса', async t => {
  const { request, login } = await fixture(t);
  const cookie = await login('editor');
  for (const id of ['abc', '0', '-1', '1.2', '9007199254740992'])
    await request('/users/' + id, 400, { cookie });
  for (const body of [{}, { name: 'Алиса' }, { name: 'Алиса', email: 'x' }, { name: 'Алиса', email: 'a@example.org', age: -1 }])
    await request('/users', 400, { cookie, method: 'POST', body });
  for (const body of [{}, { id: 7 }, { name: '   ' }, { role: 'editor' }])
    await request('/users/1', 400, { cookie, method: 'PATCH', body });
  for (const body of [{ title: 'Курс' }, { content: 'Текст' }, { title: 'Курс', content: '' }])
    await request('/articles', 400, { cookie, method: 'POST', body });
  await request('/users', 400, { cookie, method: 'POST', raw: '{' });
  await request('/users', 413, { cookie, method: 'POST', body: { name: 'x'.repeat(66000) } });
  await request('/users', 415, { cookie, method: 'POST', contentType: 'text/plain', raw: 'x' });
});
