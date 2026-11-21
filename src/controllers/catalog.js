import { renderItem, renderList } from '../views/text.js';

export function catalogController({ items, insert }) {
  return {
    list: (req, res) => res.send(renderList(items.values())),
    show: (req, res) => res.send(renderItem(res.locals.item)),
    create(req, res) {
      const item = insert(req.body);
      res.location(`${req.baseUrl}/${item.id}`).status(201).send(renderItem(item));
    },
    update(req, res) {
      const { id, item } = res.locals;
      const updated = req.method === 'PATCH' ? { ...item, ...req.body } : { id, ...req.body };
      items.set(id, updated);
      res.send(renderItem(updated));
    },
    remove(req, res) {
      items.delete(res.locals.id);
      res.send(`Запись ${res.locals.id} удалена.`);
    },
    load(req, res, next) {
      res.locals.item = items.get(res.locals.id);
      return res.locals.item ? next() : res.status(404).send('Запись не найдена.');
    }
  };
}
