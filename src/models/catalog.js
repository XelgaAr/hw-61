const seeds = {
  users: [
    { name: 'Анна Коваль', email: 'anna@example.org', age: 27 },
    { name: 'Марк Бондарь', email: 'mark@example.org' }
  ],
  articles: [
    { title: 'Что хранится в сессии', content: 'Сервер хранит роль пользователя. Браузер передаёт идентификатор сессии в cookie.' },
    { title: 'Как читать журнал запросов', content: 'У каждой завершённой операции в журнале есть время, HTTP-метод, путь и код ответа.' }
  ]
};

export function createCollection(resource) {
  const items = new Map();
  let lastId = 0;
  const insert = fields => {
    const item = { id: ++lastId, ...fields };
    items.set(item.id, item);
    return item;
  };
  seeds[resource].forEach(insert);
  return { items, insert };
}
