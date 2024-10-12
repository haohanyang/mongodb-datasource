import { test, expect } from "@grafana/plugin-e2e";
import { MongoClient } from "mongodb";

test.setTimeout(50000);

test.beforeAll(async ({ createDataSource, readProvisionedDataSource }) => {
    const ds = await readProvisionedDataSource({ fileName: "test/mongo-no-auth.yml" });
    await createDataSource(ds);

    const client = new MongoClient("mongodb://localhost:27018");
    await client.connect();
    const db = client.db("test");
    await db.collection("test_temperatureData").drop();
    await db.collection("test_temperatureData").insertMany([
        {
            "datetime": new Date("2023-10-24T18:00:00.000Z"),
            "metadata": { "city": "New York" },
            "temperature": 13.1,
        },
        {
            "datetime": new Date("2023-10-24T21:00:00.000Z"),
            "metadata": { "city": "New York" },
            "temperature": 12.1,
        },
        {
            "datetime": new Date("2023-10-25T07:00:00.000Z"),
            "metadata": { "city": "New York" },
            "temperature": 13.2,
        },
        {
            "datetime": new Date("2023-10-25T11:00:00.000Z"),
            "metadata": { "city": "Los Angeles" },
            "temperature": 18.9,
        },
        {
            "datetime": new Date("2023-10-26T08:00:00.000Z"),
            "metadata": { "city": "New York" },
            "temperature": 15.2,
        },
        {
            "datetime": new Date("2023-10-26T12:00:00.000Z"),
            "metadata": { "city": "New York" },
            "temperature": 18.5,
        },
        {
            "datetime": new Date("2023-10-26T16:00:00.000Z"),
            "metadata": { "city": "New York" },
            "temperature": 16.8,
        },
        {
            "datetime": new Date("2023-10-26T09:00:00.000Z"),
            "metadata": { "city": "Los Angeles" },
            "temperature": 22.7,
        },
        {
            "datetime": new Date("2023-10-26T14:00:00.000Z"),
            "metadata": { "city": "Los Angeles" },
            "temperature": 25.1,
        },
        {
            "datetime": new Date("2023-10-27T08:00:00.000Z"),
            "metadata": { "city": "New York" },
            "temperature": 13.9,
        },
        {
            "datetime": new Date("2023-10-27T15:00:00.000Z"),
            "metadata": { "city": "Los Angeles" },
            "temperature": 23.3,
        },
    ]);

    await client.close();
});

test("data query should return correct temperature data", async ({ panelEditPage, readProvisionedDataSource, selectors, page, createDataSource }) => {
    const query = `
  [
    {
        "$group": {
            "_id": {
                "date": {
                    "$dateToString": {
                        "format": "%Y-%m-%d",
                        "date": "$datetime"
                    }
                },
                "city": "$metadata.city"
            },
            "value": {
                "$count": {}
            }
        }
    },
    {
        "$project": {
            "ts": {
                "$toDate": "$_id.date"
            },
            "name": "$_id.city",
            "value": 1
        }
    },
    {
        "$sort": {
            "ts": 1,
            "name": 1
        }
    }
]
  `;

    const ds = await readProvisionedDataSource({ fileName: "test/mongo-no-auth.yml" });
    await panelEditPage.datasource.set(ds.name);
    await panelEditPage.getQueryEditorRow("A").getByLabel("Collection").fill("test_temperatureData");
    const editor = panelEditPage.getByGrafanaSelector(selectors.components.CodeEditor.container, {
        root: panelEditPage.getQueryEditorRow("A")
    }).getByRole("textbox");

    await editor.clear();
    await editor.fill(query);
    await panelEditPage.setVisualization("Table");
    await expect(panelEditPage.refreshPanel()).toBeOK();
    await expect(panelEditPage.panel.data).toContainText(["2", "1", "3", "1"]);
});

test("data query should return correct temperature data with Javascript query", async ({ panelEditPage, readProvisionedDataSource, selectors, page, createDataSource }) => {
  const query = `
  db.test_temperatureData.aggregate([
    {
        "$group": {
            "_id": {
                "date": {
                    "$dateToString": {
                        "format": "%Y-%m-%d",
                        "date": "$datetime"
                    }
                },
                "city": "$metadata.city"
            },
            "value": {
                "$count": {}
            }
        }
    },
    {
        "$project": {
            "ts": {
                "$toDate": "$_id.date"
            },
            "name": "$_id.city",
            "value": 1
        }
    },
    {
        "$sort": {
            "ts": 1,
            "name": 1
        }
    }
])
  `;

  const ds = await readProvisionedDataSource({ fileName: "test/mongo-no-auth.yml" });
  await panelEditPage.datasource.set(ds.name);
  await panelEditPage.getQueryEditorRow("A").getByLabel("Collection").fill("test_temperatureData");
  const selectLanguage =  panelEditPage.getQueryEditorRow("A").getByRole("combobox").last();
  await selectLanguage.click()
  await page.getByText("JavaScript", { exact: true }).click()
  const editor = panelEditPage.getByGrafanaSelector(selectors.components.CodeEditor.container, {
    root: panelEditPage.getQueryEditorRow("A")
  }).getByRole("textbox");

  await editor.clear();
  await editor.fill(query);
  await panelEditPage.setVisualization("Table");
  await expect(panelEditPage.refreshPanel()).toBeOK();
  await expect(panelEditPage.panel.data).toContainText(["2", "1", "3", "1"]);
});

test("data query should return correct temperature data with javascript function", async ({ panelEditPage, readProvisionedDataSource, selectors, page, createDataSource, dashboardPage }) => {
    const query = `
    function query() {
      return [
    {
        "$group": {
            "_id": {
                "date": {
                    "$dateToString": {
                        "format": "%Y-%m-%d",
                        "date": "$datetime"
                    }
                },
                "city": "$metadata.city"
            },
            "value": {
                "$count": {}
            }
        }
    },
    {
        "$project": {
            "ts": {
                "$toDate": "$_id.date"
            },
            "name": "$_id.city",
            "value": 1
        }
    },
    {
        "$sort": {
            "ts": 1,
            "name": 1
        }
    }
] 
    }
  `;

    const ds = await readProvisionedDataSource({ fileName: "test/mongo-no-auth.yml" });
    await panelEditPage.datasource.set(ds.name);
    await panelEditPage.getQueryEditorRow("A").getByLabel("Collection").fill("test_temperatureData");
    // get toggle switch
    const selectLanguage =  panelEditPage.getQueryEditorRow("A").getByRole("combobox").last();
    await selectLanguage.click()
    await page.getByText("JavaScriptShadow", { exact: true }).click()
    const editor = panelEditPage.getByGrafanaSelector(selectors.components.CodeEditor.container, {
        root: panelEditPage.getQueryEditorRow("A")
    }).getByRole("textbox");

    await editor.scrollIntoViewIfNeeded();
    // click on the toggle switch

    await editor.clear();
    await editor.fill(query);
    await panelEditPage.setVisualization("Table");
    await expect(panelEditPage.refreshPanel()).toBeOK();
    await expect(panelEditPage.panel.data).toContainText(["2", "1", "3", "1"]);
});
test("data query should return correct temperature data with javascript function with variables", async ({ panelEditPage, readProvisionedDataSource, selectors, page, createDataSource, dashboardPage }) => {
    const query = `
    function query() {
      return [
    {
      "$match": {
        "datetime": {
                    "$gte": {
                        "$date": {
                            "$numberLong": "$__from"
                        }
                    },
                    "$lt": {
                        "$date": {
                            "$numberLong": "$__to"
                        }
                    }
                },      
      }
    },
    {
        "$group": {
            "_id": {
                "date": {
                    "$dateToString": {
                        "format": "%Y-%m-%d",
                        "date": "$datetime"
                    }
                },
                "city": "$metadata.city"
            },
            "value": {
                "$count": {}
            }
        }
    },
    {
        "$project": {
            "ts": {
                "$toDate": "$_id.date"
            },
            "name": "$_id.city",
            "value": 1
        }
    }
] 
    }
  `;

    const ds = await readProvisionedDataSource({ fileName: "test/mongo-no-auth.yml" });
    await panelEditPage.datasource.set(ds.name);
    await panelEditPage.getQueryEditorRow("A").getByLabel("Collection").fill("test_temperatureData");
    const selectLanguage =  panelEditPage.getQueryEditorRow("A").getByRole("combobox").last();
    await selectLanguage.click()
    await page.getByText("JavaScriptShadow", { exact: true }).click()
    const editor = panelEditPage.getByGrafanaSelector(selectors.components.CodeEditor.container, {
        root: panelEditPage.getQueryEditorRow("A")
    }).getByRole("textbox");

    await panelEditPage.timeRange.set({
      from: "2023-10-24T00:00:00.000Z",
        to: "2023-10-26T00:00:00.000Z",
    })

    await editor.scrollIntoViewIfNeeded();

    await editor.clear();
    await editor.fill(query);
    await panelEditPage.setVisualization("Table");
    await expect(panelEditPage.refreshPanel()).toBeOK();
    await expect(panelEditPage.panel.data).toContainText(["2", "1"]);
});
