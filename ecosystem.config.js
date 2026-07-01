module.exports = {
  apps: [
    {
      name: 'turkexpatlar-api',
      cwd: './api',
      script: 'dist/src/main.js',
      instances: 1,
      exec_mode: 'fork',
      env_production: {
        NODE_ENV: 'production',
        PORT: 3201,
      },
      max_memory_restart: '512M',
      error_file: 'logs/api-error.log',
      out_file: 'logs/api-out.log',
    },
    {
      name: 'turkexpatlar-web',
      cwd: './web',
      script: 'node_modules/.bin/next',
      args: 'start',
      instances: 1,
      exec_mode: 'fork',
      env_production: {
        NODE_ENV: 'production',
        PORT: 3200,
      },
      max_memory_restart: '1G',
      error_file: 'logs/web-error.log',
      out_file: 'logs/web-out.log',
    },
  ],
};
