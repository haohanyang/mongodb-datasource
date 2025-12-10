const os = require('os');
const path = require('path');
const { test, expect } = require('@grafana/plugin-e2e');
const { execSync } = require('child_process');
const { MongoClient } = require('mongodb');
const { MongoMemoryServer } = require('mongodb-memory-server');

const caCertPath = path.resolve(__dirname, '..', 'certs', 'ca-ec.pem');
const clientCertKeyPath = path.resolve(__dirname, '..', 'certs', 'client-ec.pem');
const serverCertKeyPath = path.resolve(__dirname, '..', 'certs', 'server-ec.pem');
const x509ClientCertKeyPath = path.resolve(__dirname, '..', 'certs', 'client-x509.pem');
const screenshotsDir = path.resolve(__dirname, '..', 'test-screenshots');

const dbHost = os.platform() === 'linux' ? 'localhost:27017' : 'host.docker.internal:27017';

/** @type {MongoMemoryServer?} */
let server;

function getX509Subject() {
  // On powershell
  // Set-Alias openssl "C:\Program Files\Git\usr\bin\openssl.exe"
  const command = `openssl x509 -in ${x509ClientCertKeyPath} -inform PEM -subject -nameopt RFC2253`;
  const output = execSync(command).toString().trim().split('\n')[0];
  const subject = output.replace('subject=', '').trim();
  return subject;
}

test.describe('config editor', () => {
  test.afterEach(async ({ page }) => {
    console.log('Stopping MongoDB Memory Server...');
    if (server) {
      await server.stop();
      server = null;
    }

    // Take a screenshot after each test for debugging purposes
    await page.screenshot({
      fullPage: true,
      path: path.resolve(screenshotsDir, `screenshot-${Date.now()}.png`),
    });
  });

  test('Should connect to when mongo without auth', async ({ createDataSourceConfigPage, page }) => {
    server = await MongoMemoryServer.create({
      instance: { port: 27017 },
      binary: {
        version: '8.0.0',
      },
    });

    const configPage = await createDataSourceConfigPage({ type: 'haohanyang-mongodb-datasource' });

    await page.getByLabel('Host').fill(dbHost);
    await page.getByLabel('Database').fill('test');
    await page.getByRole('radio', { name: 'None' }).check();
    await expect(configPage.saveAndTest()).toBeOK();
  });

  test('Should connect to mongo with username/password auth', async ({ createDataSourceConfigPage, page }) => {
    server = await MongoMemoryServer.create({
      instance: { port: 27017 },
      binary: {
        version: '8.0.0',
      },
      auth: {
        enable: true,
        customRootName: 'user',
        customRootPwd: 'pass',
      },
    });

    const configPage = await createDataSourceConfigPage({ type: 'haohanyang-mongodb-datasource' });
    await page.getByLabel('Host').fill(dbHost);
    await page.getByLabel('Database').fill('test');
    await page.getByRole('radio', { name: 'Username/Password', exact: true }).check();
    await page.getByLabel('Username', { exact: true }).fill('user');
    await page.getByLabel('Password', { exact: true }).fill('pass');
    // TODO: This should be default
    //await page.getByLabel('Authentication Database', { exact: true }).fill('admin');

    await expect(configPage.saveAndTest()).toBeOK();
  });

  test('Should connect to mongo with username/password auth and tls certificates', async ({
    createDataSourceConfigPage,
    page,
  }) => {
    server = await MongoMemoryServer.create({
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

    const configPage = await createDataSourceConfigPage({ type: 'haohanyang-mongodb-datasource' });

    await page.getByLabel('Host').fill(dbHost);
    await page.getByLabel('Database').fill('test');
    await page.getByRole('radio', { name: 'Username/Password', exact: true }).check();
    await page.getByLabel('Username', { exact: true }).fill('user');
    await page.getByLabel('Password', { exact: true }).fill('pass');
    // TODO: This should be default
    await page.getByLabel('Authentication Database', { exact: true }).fill('admin');

    // TLS setup
    await page.getByRole('radio', { name: 'On', exact: true }).check();
    await page.getByLabel('Certificate Authority (.pem)').fill('/certs/ca-ec.pem');
    await page.getByLabel('Client Certificate and Key (.pem)').fill('/certs/client-ec.pem');
    // await page.getByLabel('Client Key Password', { exact: true }).fill('clientkeypass');

    await expect(configPage.saveAndTest()).toBeOK();
  });

  test('Should connect to mongo with username/password auth, tls certificates and client key password', async ({
    createDataSourceConfigPage,
    page,
  }) => {
    server = await MongoMemoryServer.create({
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

    const configPage = await createDataSourceConfigPage({ type: 'haohanyang-mongodb-datasource' });

    await page.getByLabel('Host').fill(dbHost);
    await page.getByLabel('Database').fill('test');
    await page.getByRole('radio', { name: 'Username/Password', exact: true }).check();
    await page.getByLabel('Username', { exact: true }).fill('user');
    await page.getByLabel('Password', { exact: true }).fill('pass');
    // TODO: This should be default
    await page.getByLabel('Authentication Database', { exact: true }).fill('admin');

    // TLS setup
    await page.getByRole('radio', { name: 'On', exact: true }).check();
    await page.getByLabel('Certificate Authority (.pem)').fill('/certs/ca-ec.pem');
    await page.getByLabel('Client Certificate and Key (.pem)').fill('/certs/client-ec-encrypted.pem');
    await page.getByLabel('Client Key Password').fill('clientkeypass');

    await expect(configPage.saveAndTest()).toBeOK();
  });

  test('Should connect to mongo with x509 auth and tls certificates', async ({ createDataSourceConfigPage, page }) => {
    server = await MongoMemoryServer.create({
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

    const client = new MongoClient(server.getUri(), {
      tls: true,
      tlsCAFile: caCertPath,
      tlsCertificateKeyFile: clientCertKeyPath,
      auth: {
        username: 'user',
        password: 'pass',
      },
    });

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

    const configPage = await createDataSourceConfigPage({ type: 'haohanyang-mongodb-datasource' });

    await page.getByLabel('Host').fill(dbHost);
    await page.getByLabel('Database').fill('test');
    await page.getByRole('radio', { name: 'X.509', exact: true }).check();

    await page.getByRole('radio', { name: 'On', exact: true }).check();
    await page.getByLabel('Certificate Authority (.pem)').fill('/certs/ca-ec.pem');
    await page.getByLabel('Client Certificate and Key (.pem)').fill('/certs/client-x509.pem');

    await expect(configPage.saveAndTest()).toBeOK();
  });
});
