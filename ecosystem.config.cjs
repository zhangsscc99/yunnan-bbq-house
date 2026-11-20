module.exports = {
  apps: [{
    name: 'yunnan-bbq',
    script: 'server/index.js',
    cwd: '/www/yunnan-bbq-house',
    node_args: [],
    instances: 1,
    autorestart: true,
    max_restarts: 100,
    min_uptime: '10s',
    restart_delay: 2000,
    max_memory_restart: '1G',
    env: { NODE_ENV: 'production', PORT: '3031' },
    out_file: '/www/yunnan-bbq-house/data/out.log',
    error_file: '/www/yunnan-bbq-house/data/err.log',
    merge_logs: true,
    time: true
  }]
};
