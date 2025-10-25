import { test, expect } from '@grafana/plugin-e2e';

test('"Save & test" should be successful when mongo without auth config is valid', async ({
  createDataSourceConfigPage,
  page,
}) => {
  const configPage = await createDataSourceConfigPage({ type: 'haohanyang-mongodb-datasource' });
  await page.getByLabel('Host').fill('mongo-no-auth');
  await page.getByLabel('Port').fill('27017');
  await page.getByLabel('Database').fill('test');
  await page.getByRole('radio', { name: 'None' }).check();
  await expect(configPage.saveAndTest()).toBeOK();
});

test('"Save & test" should be successful when mongo username-password auth config is valid', async ({
  createDataSourceConfigPage,
  page,
}) => {
  const configPage = await createDataSourceConfigPage({ type: 'haohanyang-mongodb-datasource' });
  await page.getByLabel('Host').fill('mongo-username-password-auth');
  await page.getByLabel('Port').fill('27017');
  await page.getByLabel('Database').fill('test');
  await page.getByRole('radio', { name: 'Username/Password', exact: true }).check();
  await page.getByLabel('Username', { exact: true }).fill('username');
  await page.getByLabel('Password', { exact: true }).fill('password');
  await expect(configPage.saveAndTest()).toBeOK();
});

test('"Save & test" should be successful when mongo tls auth config is valid', async ({
  createDataSourceConfigPage,
  page,
}) => {
  const configPage = await createDataSourceConfigPage({ type: 'haohanyang-mongodb-datasource' });
  await page.getByLabel('Host').fill('mongo-tls-auth');
  await page.getByLabel('Port').fill('27017');
  await page.getByLabel('Database').fill('test');
  await page.getByRole('radio', { name: 'TLS/SSL', exact: true }).check();
  await page.screenshot({ path: 'mongo-tls-auth1.png' });

  await page.getByLabel('Certificate Authority').fill('/certs/ca.pem');
  await page.getByLabel('Client Certificate').fill('/certs/mongodb.crt');
  await page.getByPlaceholder('/path/to/mongodb.pem').fill('/certs/mongodb.pem');
  await expect(configPage.saveAndTest()).toBeOK();
});
