import { test, expect } from '@grafana/plugin-e2e';
import { MongoDataSourceOptions, MySecureJsonData } from '../src/types';

test('"Save & test" should be successful when mongo without auth config is valid', async ({
  createDataSourceConfigPage,
  readProvisionedDataSource,
  page,
}) => {
  const ds = await readProvisionedDataSource<MongoDataSourceOptions, MySecureJsonData>({ fileName: 'test/mongo-no-auth.yml' });
  console.log(ds.jsonData)
  const configPage = await createDataSourceConfigPage({ type: ds.type });
  await page.getByLabel("Host").fill(ds.jsonData.host || "")
  await page.getByLabel("Port").fill(ds.jsonData.port?.toString() || "")
  await page.getByLabel("Database").fill(ds.jsonData.database || "")
  await page.getByRole("radio", { name: "None" }).check()
  await expect(configPage.saveAndTest()).toBeOK();
});

test('"Save & test" should be successful when mongo username-password auth config is valid', async ({
  createDataSourceConfigPage,
  readProvisionedDataSource,
  page,
}) => {
  const ds = await readProvisionedDataSource<MongoDataSourceOptions, MySecureJsonData>({ fileName: 'test/mongo-username-password-auth.yml' });
  console.log(ds.jsonData)
  console.log(ds.secureJsonData?.password)
  const configPage = await createDataSourceConfigPage({ type: ds.type });
  await page.getByLabel("Host").fill(ds.jsonData.host || "")
  await page.getByLabel("Port").fill(ds.jsonData.port?.toString() || "")
  await page.getByLabel("Database").fill(ds.jsonData.database || "")
  await page.getByRole("radio", { name: "Username/Password", exact: true }).check()
  await page.getByLabel("Username", { exact: true }).fill(ds.jsonData.username || "")
  await page.getByLabel("Password", { exact: true }).fill(ds.secureJsonData?.password || "")
  await expect(configPage.saveAndTest()).toBeOK();
});