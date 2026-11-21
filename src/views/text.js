const names = { name: 'Имя', email: 'Email', age: 'Возраст', title: 'Заголовок', content: 'Текст' };

export const renderItem = ({ id, ...fields }) => [
  `ID: ${id}`,
  ...Object.entries(fields).map(([key, value]) => `${names[key]}: ${value}`)
].join('\n');

export const renderList = items => Array.from(items, renderItem).join('\n\n') || 'Список пуст.';
