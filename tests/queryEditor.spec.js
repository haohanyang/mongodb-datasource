const path = require('path');
const https = require('https');
const { createInterface } = require('readline');
const { EJSON } = require('bson');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { test, expect } = require('@grafana/plugin-e2e');
const { MongoClient, Db } = require('mongodb');

const screenshotsDir = path.resolve(__dirname, '..', 'test-screenshots');

/**
 * @param {string} url
 * @param {Db} db
 */
async function loadRemoteDataToMongo(url, db) {
  const collName = path.basename(url).split('.')[0];

  await db.collection(collName).drop();

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
        db.collection(collName)
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

test.describe('query editor', () => {
  /** @type {MongoMemoryServer?} */
  let mongoServer;

  test.beforeAll(async ({ createDataSource, readProvisionedDataSource }) => {
    // Prepare MongoDB
    mongoServer = await MongoMemoryServer.create({
      binary: {
        version: '8.0.0',
      },
    });

    const client = new MongoClient(mongoServer.getUri());
    const customerDataUrl =
      'https://raw.githubusercontent.com/neelabalan/mongodb-sample-dataset/refs/heads/main/sample_analytics/customers.json';
    await loadRemoteDataToMongo(customerDataUrl, client.db('test'));
    await client.close();

    // Prepare data source
    const ds = await readProvisionedDataSource({ fileName: 'test/mongo-default.yml' });

    await createDataSource(ds);
  });

  test.afterEach(async ({ page }) => {
    // Take a screenshot after each test for debugging purposes
    await page.screenshot({
      fullPage: true,
      path: path.resolve(screenshotsDir, `screenshot-${Date.now()}.png`),
    });
  });

  test.afterAll(async () => {
    if (mongoServer) {
      console.log('Stopping MongoDB Memory Server...');
      await mongoServer.stop();
    }
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

    await panelEditPage.getQueryEditorRow('A').getByText('Enter your collection').click();
    await page.keyboard.type('test_customerData');
    await page.keyboard.press('Enter');

    const editor = panelEditPage
      .getByGrafanaSelector(selectors.components.CodeEditor.container, {
        root: panelEditPage.getQueryEditorRow('A'),
      })
      .getByRole('textbox');

    await editor.clear();
    await editor.fill(query);
    await panelEditPage.setVisualization('Table');
    await expect(panelEditPage.refreshPanel()).toBeOK();
    // await expect(panelEditPage.panel.data).toContainText(['164', 'gmail.com', '165', 'yahoo.com', '171', 'hotmail.com']);
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

    await panelEditPage.getQueryEditorRow('A').getByText('Enter your collection').click();
    await page.keyboard.type('test_customerData');
    await page.keyboard.press('Enter');

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
    // await expect(panelEditPage.panel.data).toContainText(['164', 'gmail.com', '165', 'yahoo.com', '171', 'hotmail.com']);
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

    await panelEditPage.getQueryEditorRow('A').getByText('Enter your collection').click();
    await page.keyboard.type('test_customerData');
    await page.keyboard.press('Enter');

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
    // await expect(panelEditPage.panel.data).toContainText(['164', 'gmail.com', '165', 'yahoo.com', '171', 'hotmail.com']);
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

    await panelEditPage.getQueryEditorRow('A').getByText('Enter your collection').click();
    await page.keyboard.type('test_customerData');
    await page.keyboard.press('Enter');

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
    // await expect(panelEditPage.panel.data).toContainText(['164', 'gmail.com', '165', 'yahoo.com', '171', 'hotmail.com']);
  });
});
