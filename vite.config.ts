import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  plugins: [
    {
      name: 'littlejs-full-reload',
      handleHotUpdate({ server, modules, timestamp }) {
        const invalidatedModules = new Set();
        for (const mod of modules)
          server.moduleGraph.invalidateModule(mod, invalidatedModules, timestamp, true);
        server.ws.send({ type: 'full-reload' });
        return [];
      },
    },
  ],
});
