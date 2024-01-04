module.exports = {
    apps: [{
    name: 'app',
    script: './dist/Server.js',
    instances: 4,
    exec_mode: 'cluster'
    }]
  }