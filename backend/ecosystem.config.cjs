/**
 * PM2 config for sector-backend.
 * Запуск: из папки backend выполнить: pm2 start ecosystem.config.cjs
 */
module.exports = {
  apps: [
    {
      name: "sector-backend",
      script: "src/server.js",
      cwd: __dirname,
      node_args: "--enable-source-maps",
      env: {
        NODE_ENV: "production",
      },
      // .env подхватывается из backend/.env (cwd = backend)
      instances: 1,
      autorestart: true,
      watch: false,
      max_restarts: 10,
      min_uptime: "5s",
      max_memory_restart: "400M",
    },
  ],
};
