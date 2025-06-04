module.exports = {
  apps: [
    {
      name: 'vite-site',
      script: 'serve',
      args: '-s dist -l 3000', // serve from dist on port 3000
      exec_mode: 'fork',
    },
  ],
};
