const path = require('path');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { MongoClient } = require('mongodb');

const caCertPath = path.resolve(__dirname, '..', 'certs', 'ca-ec.pem');
const clientCertKeyPath = path.resolve(__dirname, '..', 'certs', 'client-ec.pem');
const serverCertKeyPath = path.resolve(__dirname, '..', 'certs', 'server-ec.pem');

async function main() {
  const server = await MongoMemoryServer.create({
    instance: {
      port: 27017,
      args: ['--tlsMode', 'preferTLS', '--tlsCAFile', caCertPath, '--tlsCertificateKeyFile', serverCertKeyPath],
    },
    binary: {
      version: '8.0.0',
    },
    auth: {
      enable: true,
      customRootName: 'user',
      customRootPwd: 'pass',
    },
  });

  console.log('MongoDB Memory Server started at:', server.getUri());

  const client = new MongoClient(server.getUri(), {
    tls: true,
    tlsCAFile: caCertPath,
    tlsCertificateKeyFile: clientCertKeyPath,
    auth: {
      username: 'user',
      password: 'pass',
    },
  });

  process.on('SIGINT', async () => {
    console.log('Stopping MongoDB Memory Server...');
    await server.stop();
    await client.close();
    process.exit(0);
  });

  try {
    await client.connect();
    console.log('Connected to MongoDB Memory Server with TLS and Auth');
  } catch (err) {
    console.error('Error connecting to MongoDB Memory Server:', err);
  }
}
main().catch((err) => {
  console.error(err);
  process.exit(1);
});
