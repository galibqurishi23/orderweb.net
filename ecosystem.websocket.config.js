module.exports = {
  apps: [
    {
      name: 'orderweb-websocket',
      script: './websocket-server-standalone.js',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production',
        WS_PORT: 9011
      },
      error_file: './logs/websocket-error.log',
      out_file: './logs/websocket-out.log',
      log_file: './logs/websocket-combined.log',
      time: true
    }
  ]
};
