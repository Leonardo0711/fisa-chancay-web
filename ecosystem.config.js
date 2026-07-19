module.exports = {
  apps: [{
    name: 'stg-app-chancay-web',
    script: 'server.js',
    cwd: 'C:\\FISA\\industrial-platform\\staging\\apps\\chancay-web',
    exec_mode: 'fork',
    instances: 1,
    env: {
      NODE_ENV: 'production',
      ENV_FILE: 'C:\\FISA\\industrial-platform\\secrets\\staging\\chancay-web.env'
    }
  }]
}
