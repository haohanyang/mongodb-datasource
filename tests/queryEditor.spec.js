const path = require('path');
const https = require('https');
const { createInterface } = require('readline');
const { EJSON } = require('bson');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { test, expect } = require('@grafana/plugin-e2e');
const { MongoClient, Db } = require('mongodb');

test.setTimeout(100 * 1000);

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

  /** @type {import('@grafana/data').DataSourceInstanceSettings} */
  let ds;

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

    const port = new URL(mongoServer.getUri()).port;

    ds = await createDataSource({
      name: 'MongoDB Test Datasource',
      type: 'haohanyang-mongodb-datasource',
      access: 'proxy',
      isDefault: false,
      orgId: 1,
      version: 1,
      editable: true,
      jsonData: {
        host: `host.docker.internal:${port}`,
        database: 'test',
      },
    });
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

  test('data query should return correct customer data with JSON query', async ({ panelEditPage, selectors, page }) => {
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

    await panelEditPage.datasource.set(ds.name);

    await panelEditPage.getQueryEditorRow('A').getByText('Enter your collection').click();
    await page.keyboard.type('customers');
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
    await expect(panelEditPage.panel.data).toContainText([
      '164',
      'gmail.com',
      '165',
      'yahoo.com',
      '171',
      'hotmail.com',
    ]);
  });

  test('data query should return correct customer data with JavaScript query', async ({
    panelEditPage,
    selectors,
    page,
  }) => {
    const query = `
[
  {
    $project: {
      domain: {
        $arrayElemAt: [
          {
            $split: ['$email', '@'],
          },
          1,
        ],
      },
    },
  },
  {
    $group: {
      _id: '$domain',
      count: {
        $sum: 1,
      },
    },
  },
  {
    $project: {
      _id: 0,
      provider: '$_id',
      count: 1,
    },
  },
  {
    $sort: {
      count: 1,
    },
  },
]

    `;

    await panelEditPage.datasource.set(ds.name);

    await panelEditPage.getQueryEditorRow('A').getByText('Enter your collection').click();
    await page.keyboard.type('customers');
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
    await expect(panelEditPage.panel.data).toContainText([
      '164',
      'gmail.com',
      '165',
      'yahoo.com',
      '171',
      'hotmail.com',
    ]);
  });
});
