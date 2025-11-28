const path = require('path');
const { MongoMemoryServer } = require('mongodb-memory-server');

MongoMemoryServer.create({
  instance: {
    port: 27017,
    args: [
      '--tlsMode',
      'preferTLS',
      '--tlsCAFile',
      path.resolve(__dirname, '..', 'certs', 'ca-ec.pem'),
      '--tlsCertificateKeyFile',
      path.resolve(__dirname, '..', 'certs', 'client-ec.pem'),
      // '--tlsCertificateKeyFilePassword',
      // 'myclientpass',
    ],
  },
  binary: {
    version: '8.0.0',
  },
  auth: {
    enable: true,
    customRootName: 'user',
    customRootPwd: 'pass',
  },
})
  .then((server) => {
    console.log('MongoDB Memory Server started at:', server.getUri());

    process.on('SIGINT', async () => {
      console.log('Stopping MongoDB Memory Server...');
      await server.stop();
      process.exit(0);
    });
  })
  .catch((err) => {
    console.error('Error starting MongoDB Memory Server:', err);
    process.exit(1);
  });
