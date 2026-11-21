import { scenarios, runScenario } from './scenarios.js';

const byId = id => document.getElementById(id);
const list = byId('cases');
const filters = document.querySelector('.filters');
const replay = byId('replay');
const copy = byId('copy');
const live = document.documentElement.dataset.mode === 'live';
let current;
let saved;
let filter = 'all';

function showResponse(result) {
  byId('status').textContent = result.status + ' ' + result.phrase;
  byId('status').classList.toggle('error', result.status >= 400);
  byId('content-type').textContent = 'Content-Type: ' + result.type;
  byId('output').textContent = result.text;
  copy.disabled = false;
}

function select() {
  current = scenarios.find(item => '#' + item.id === location.hash) ?? scenarios[0];
  if (list.querySelector('a[href="#' + current.id + '"]').hidden)
    applyFilter('all');
  for (const entry of list.children) {
    if (entry.hash === '#' + current.id)
      entry.setAttribute('aria-current', 'true');
    else
      entry.removeAttribute('aria-current');
  }
  byId('scenario-title').textContent = current.title;
  byId('note').textContent = current.note;
  byId('method').textContent = current.method ?? 'GET';
  byId('path').textContent = current.path;
  byId('role').textContent = current.role;
  byId('payload').hidden = !current.body;
  byId('request-body').textContent = current.body ? JSON.stringify(current.body, null, 2) : '';
  byId('mode').textContent = 'Сохранённый ответ Express';
  byId('feedback').textContent = '';
  showResponse(saved[current.id]);
}

function applyFilter(value) {
  filter = value;
  for (const control of filters.querySelectorAll('button'))
    control.setAttribute('aria-pressed', String(control.dataset.filter === filter));
  for (const entry of list.children)
    entry.hidden = filter !== 'all' && entry.dataset.group !== filter;
}

async function start() {
  const response = await fetch('./responses.json');
  if (!response.ok)
    throw new Error('Не удалось получить примеры.');
  saved = await response.json();
  for (const scenario of scenarios) {
    const entry = document.createElement('a');
    entry.href = '#' + scenario.id;
    entry.className = 'entry';
    entry.dataset.group = saved[scenario.id].status < 400 ? 'ok' : 'error';
    for (const [name, value] of [
      ['entry-title', scenario.title],
      ['list-method', (scenario.method ?? 'GET') + ' ' + scenario.path],
      ['row-status', saved[scenario.id].status]
    ]) {
      const part = document.createElement('span');
      part.className = name;
      part.textContent = value;
      entry.append(part);
    }
    list.append(entry);
  }
  filters.addEventListener('click', event => {
    const value = event.target.closest('button')?.dataset.filter;
    if (!value)
      return;
    applyFilter(value);
    if (list.querySelector('[aria-current]').hidden)
      location.hash = list.querySelector('a:not([hidden])').hash;
  });
  window.addEventListener('hashchange', select);
  select();
  replay.hidden = !live;
}

replay.addEventListener('click', async () => {
  const scenario = current;
  replay.disabled = true;
  byId('feedback').textContent = 'Запрос отправлен…';
  try {
    const result = await runScenario(location.origin, scenario);
    if (current === scenario) {
      byId('mode').textContent = 'Ответ локального сервера';
      byId('feedback').textContent = '';
      showResponse(result);
    }
  } catch (error) {
    if (current === scenario)
      byId('feedback').textContent = 'Ошибка запроса. ' + error.message;
  } finally {
    replay.disabled = false;
  }
});

copy.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(byId('output').textContent);
    byId('feedback').textContent = 'Ответ скопирован.';
  } catch {
    byId('feedback').textContent = 'Выделите текст ответа и скопируйте его вручную.';
  }
});

start().catch(() => {
  byId('scenario-title').textContent = 'Ответы недоступны';
  byId('note').textContent = 'Откройте страницу через GitHub Pages или запустите npm run demo из папки проекта.';
});
