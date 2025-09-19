import https from 'https';
import { createInterface } from 'readline';
import { EJSON } from 'bson';
import { test, expect } from '@grafana/plugin-e2e';
import { MongoClient } from 'mongodb';

test.setTimeout(100000);

/**
 *
 * @param {string} url
 * @param {MongoClient} mongoClient
 */
async function downloadAndStoreCustomersData(url, mongoClient) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      const rl = createInterface({
        input: res,
      });

      const docs = [];

      rl.on('line', (line) => {
        const doc = EJSON.parse(line);
        docs.push(doc);
      });

      rl.on('close', () => {
        mongoClient
          .db('test')
          .collection('test_customerData')
          .insertMany(docs)
          .then((data) => {
            resolve(data);
          })
          .catch((err) => {
            reject(err);
          });
      });

      rl.on('error', (err) => {
        reject(err);
      });
    });
  });
}

test.beforeAll(async ({ createDataSource, readProvisionedDataSource }) => {
  const ds = await readProvisionedDataSource({ fileName: 'test/mongo-default.yml' });

  await createDataSource(ds);

  const client = new MongoClient('mongodb://localhost:27018');

  await client.db('test').collection('test_customerData').drop();

  const customerDataUrl =
    'https://raw.githubusercontent.com/neelabalan/mongodb-sample-dataset/refs/heads/main/sample_analytics/customers.json';

  await downloadAndStoreCustomersData(customerDataUrl, client);

  await client.close();
});

test('data query should return correct customer data with JSON query', async ({
  panelEditPage,
  readProvisionedDataSource,
  selectors,
  page,
}) => {
  const query = `
[
  {
    "$project": {
      "domain": {
        "$arrayElemAt": [
          {
            "$split": [
              "$email",
              "@"
            ]
          },
          1
        ]
      }
    }
  },
  {
    "$group": {
      "_id": "$domain",
      "count": {
        "$sum": 1
      }
    }
  },
  {
    "$project": {
      "_id": 0,
      "provider": "$_id",
      "count": 1
    }
  },
  {
    "$sort": {
      "count": 1
    }
  }
]
  `;

  const ds = await readProvisionedDataSource({ fileName: 'test/mongo-default.yml' });

  await panelEditPage.datasource.set(ds.name);
  await panelEditPage.getQueryEditorRow('A').getByLabel('Collection').fill('test_customerData');
  const editor = panelEditPage
    .getByGrafanaSelector(selectors.components.CodeEditor.container, {
      root: panelEditPage.getQueryEditorRow('A'),
    })
    .getByRole('textbox');

  await editor.clear();
  await editor.fill(query);
  await panelEditPage.setVisualization('Table');
  await expect(panelEditPage.refreshPanel()).toBeOK();
  await expect(panelEditPage.panel.data).toContainText(['164', 'gmail.com', '165', 'yahoo.com', '171', 'hotmail.com']);
});

test('data query should return correct temperature data with JavaScript query', async ({
  panelEditPage,
  readProvisionedDataSource,
  selectors,
  page,
}) => {
  const query = `
  db.test_customerData.aggregate([
  {
    "$project": {
      "domain": {
        "$arrayElemAt": [
          {
            "$split": [
              "$email",
              "@"
            ]
          },
          1
        ]
      }
    }
  },
  {
    "$group": {
      "_id": "$domain",
      "count": {
        "$sum": 1
      }
    }
  },
  {
    "$project": {
      "_id": 0,
      "provider": "$_id",
      "count": 1
    }
  },
  {
    "$sort": {
      "count": 1
    }
  }
])
  `;

  const ds = await readProvisionedDataSource({ fileName: 'test/mongo-default.yml' });
  await panelEditPage.datasource.set(ds.name);
  await panelEditPage.getQueryEditorRow('A').getByLabel('Collection').fill('test_temperatureData');
  const selectLanguage = panelEditPage.getQueryEditorRow('A').getByRole('combobox').last();
  await selectLanguage.click();
  await page.getByText('JavaScript', { exact: true }).click();
  const editor = panelEditPage
    .getByGrafanaSelector(selectors.components.CodeEditor.container, {
      root: panelEditPage.getQueryEditorRow('A'),
    })
    .getByRole('textbox');

  await editor.clear();
  await editor.fill(query);
  await panelEditPage.setVisualization('Table');
  await expect(panelEditPage.refreshPanel()).toBeOK();
  await expect(panelEditPage.panel.data).toContainText(['164', 'gmail.com', '165', 'yahoo.com', '171', 'hotmail.com']);
});

test('data query should return correct temperature data with JavaScript function', async ({
  panelEditPage,
  readProvisionedDataSource,
  selectors,
  page,
}) => {
  const query = `
    function query() {
      return [
  {
    "$project": {
      "domain": {
        "$arrayElemAt": [
          {
            "$split": [
              "$email",
              "@"
            ]
          },
          1
        ]
      }
    }
  },
  {
    "$group": {
      "_id": "$domain",
      "count": {
        "$sum": 1
      }
    }
  },
  {
    "$project": {
      "_id": 0,
      "provider": "$_id",
      "count": 1
    }
  },
  {
    "$sort": {
      "count": 1
    }
  }
]
    }
  `;

  const ds = await readProvisionedDataSource({ fileName: 'test/mongo-default.yml' });
  await panelEditPage.datasource.set(ds.name);
  await panelEditPage.getQueryEditorRow('A').getByLabel('Collection').fill('test_customerData');
  // get toggle switch
  const selectLanguage = panelEditPage.getQueryEditorRow('A').getByRole('combobox').last();
  await selectLanguage.click();
  await page.getByText('JavaScript Shadow', { exact: true }).click();
  const editor = panelEditPage
    .getByGrafanaSelector(selectors.components.CodeEditor.container, {
      root: panelEditPage.getQueryEditorRow('A'),
    })
    .getByRole('textbox');

  await editor.scrollIntoViewIfNeeded();
  // click on the toggle switch

  await editor.clear();
  await editor.fill(query);
  await panelEditPage.setVisualization('Table');
  await expect(panelEditPage.refreshPanel()).toBeOK();
  await page.screenshot({ path: 'query.png', fullPage: true });
  await expect(panelEditPage.panel.data).toContainText(['164', 'gmail.com', '165', 'yahoo.com', '171', 'hotmail.com']);
});

test('data query should return correct temperature data with javascript function with variables', async ({
  panelEditPage,
  readProvisionedDataSource,
  selectors,
  page,
}) => {
  const query = `
    function query() {
      return [
  {
    "$project": {
      "domain": {
        "$arrayElemAt": [
          {
            "$split": [
              "$email",
              "@"
            ]
          },
          1
        ]
      }
    }
  },
  {
    "$group": {
      "_id": "$domain",
      "count": {
        "$sum": 1
      }
    }
  },
  {
    "$project": {
      "_id": 0,
      "provider": "$_id",
      "count": 1
    }
  },
  {
    "$sort": {
      "count": 1
    }
  }
]
    }
  `;

  const ds = await readProvisionedDataSource({ fileName: 'test/mongo-default.yml' });
  await panelEditPage.datasource.set(ds.name);
  await panelEditPage.getQueryEditorRow('A').getByLabel('Collection').fill('test_customerData');
  const selectLanguage = panelEditPage.getQueryEditorRow('A').getByRole('combobox').last();
  await selectLanguage.click();
  await page.getByText('JavaScript Shadow', { exact: true }).click();
  const editor = panelEditPage
    .getByGrafanaSelector(selectors.components.CodeEditor.container, {
      root: panelEditPage.getQueryEditorRow('A'),
    })
    .getByRole('textbox');

  await panelEditPage.timeRange.set({
    from: '2023-10-24T00:00:00.000Z',
    to: '2023-10-26T00:00:00.000Z',
  });

  await editor.scrollIntoViewIfNeeded();

  await editor.clear();
  await editor.fill(query);
  await panelEditPage.setVisualization('Table');
  await expect(panelEditPage.refreshPanel()).toBeOK();
  await expect(panelEditPage.panel.data).toContainText(['164', 'gmail.com', '165', 'yahoo.com', '171', 'hotmail.com']);
});
