const path = require('path');
const { execSync } = require('child_process');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { MongoClient } = require('mongodb');

const caCertPath = path.resolve(__dirname, '..', 'certs', 'ca-ec.pem');
const clientCertKeyPath = path.resolve(__dirname, '..', 'certs', 'client-ec.pem');
const serverCertKeyPath = path.resolve(__dirname, '..', 'certs', 'server-ec.pem');
const x509ClientCertKeyPath = path.resolve(__dirname, '..', 'certs', 'client-x509.pem');

function getX509Subject() {
  const command = `openssl x509 -in ${x509ClientCertKeyPath} -inform PEM -subject -nameopt RFC2253`;
  const output = execSync(command).toString().trim().split('\n')[0];
  const subject = output.replace('subject=', '').trim();
  return subject;
}

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
    console.log('Connected to MongoDB Memory Server');

    // Create x.509 User
    const subject = getX509Subject();
    await client.db('$external').command({
      createUser: subject,
      roles: [
        { role: 'readWrite', db: 'test' },
        { role: 'userAdminAnyDatabase', db: 'admin' },
      ],
      writeConcern: { w: 'majority', wtimeout: 5000 },
    });
    console.log(`Created x.509 user: ${subject}`);
  } catch (err) {
    console.error(err);
  }
}
main().catch((err) => {
  console.error(err);
  process.exit(1);
});
