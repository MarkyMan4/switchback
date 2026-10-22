import { defineConfig } from 'vite';

export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/switchback/' : '/',
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
}));
