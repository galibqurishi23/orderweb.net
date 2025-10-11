module.exports = {
  apps: [
    {
      name: 'orderwebsystem-production',
      script: 'node_modules/next/dist/bin/next',
      args: 'start',
      cwd: '/home/opc/orderweb-app',
      instances: 'max',
      exec_mode: 'cluster',
      watch: false,
      max_memory_restart: '1G',
      node_args: '--max-old-space-size=4096',
      env: {
        NODE_ENV: 'production',
        PORT: 9010
      },
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: './logs/error.log',
      out_file: './logs/access.log',
      log_file: './logs/combined.log',
      time: true
    },
    {
      name: 'orderweb-websocket',
      script: 'websocket-server-standalone.js',
      cwd: '/home/opc/orderweb-app',
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
        WS_PORT: 9011
      },
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: './logs/websocket-error.log',
      out_file: './logs/websocket-out.log',
      log_file: './logs/websocket-combined.log',
      time: true
    }
  ]
};
