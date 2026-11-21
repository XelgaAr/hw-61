import { createApp } from './src/app.js';

const host = process.env.HOST ?? '127.0.0.1';
const port = Number(process.env.PORT ?? 3000);
const server = createApp().listen(port, host, () => {
  console.log(`http://${host}:${server.address().port}/`);
});
