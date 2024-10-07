# Grafana MongoDB data source
![example branch parameter](https://github.com/haohanyang/mongodb-datasource/actions/workflows/ci.yml/badge.svg?branch=master)

This plugin provides a Grafana datasource for querying and visualizing data from MongoDB.

[Download the latest build](https://github.com/haohanyang/mongodb-datasource/actions/runs/11219607911/artifacts/2024932705)

![screenshot](/static/screenshot.png)

## Use
### Query language
The query text should be a valid MongoDB Aggregate pipeline - an array consisting of MongoDB Aggregate operations. Your may use the Grafana's built-in variables `"$__from"` and `"$__to"` to query data based on the current panel's time range. The plugin supports JSON and JavaScript query languages. In JSON query, you need to enter the database in the UI. Here is an example of JSON query.
```json
[
    {
        "$match": {
            "createdTime": {
                "$gt": {
                    "$numberLong": "$__from"
                },
                "$lt": {
                    "$numberLong": "$__from"
                }
            }
        }
    }
]
```
In JavaScript query, you need to follow the format `db.<collection-name>.aggregate([<json-query>])`. As shows in the following example.
```js
db.transactions.aggregate({
    "$match": {
        "createdTime": {
            "$gt": {
                "$numberLong": "$__from"
            },
            "$lt": {
                "$numberLong": "$__from"
            }
        }
    }
});
```

You can also use the `"$from"` and `"$to"` conventions originated from a legacy plugin
```json
[
    {
        "$match": {
            "createdTime": {
                "$gt": "$from",
                "$lt": "$to"
            }
        }
    }
]
```
### Query type
#### Time series
Time series query type is suitable for time series panels. The query results should consist the following fields:
* `ts`
The timestamp
* `value`
Either integer or double. Currently all values should be of the same type.
* `name` (Optional)
Useful if you want to show time series data of different categories.

Here is an example of JSON query from [Sample AirBnB Listings Dataset](https://www.mongodb.com/docs/atlas/sample-data/sample-airbnb/). The query shows the number of created AirBnB reviews of apartment and house property type in each month during the selected time range.
```json
[
    {
        "$match": {
            "first_review": {
                "$gt": {
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
            "property_type": {
                "$in": [
                    "Apartment",
                    "House"
                ]
            }
        }
    },
    {
        "$group": {
            "_id": {
                "month": {
                    "$dateToString": {
                        "format": "%Y-%m",
                        "date": "$first_review"
                    }
                },
                "property_type": "$property_type"
            },
            "value": {
                "$count": {}
            }
        }
    },
    {
        "$project": {
            "ts": {
                "$toDate": "$_id.month"
            },
            "name": "$_id.property_type",
            "value": 1
        }
    }
]
```
#### table
Table type is more flexible and doesn't require the output schema. This usually fits  panels that don't require timestamp.


## Install
* Download the artifact package plugin `haohanyang-mongodb-datasource-<version>.zip` from [GitHub Action](https://github.com/haohanyang/mongodb-datasource/actions/workflows/ci.yml?query=branch%3Amaster) page to the root directory (where the `docker-compose.yaml` exists) and extract files to folder `mongodb-datasource`

```bash
unzip haohanyang-mongodb-datasource-<version>.zip -d mongodb-datasource
```
* Grant `0755`(`-rwxr-xr-x`) permission to binaries in `mongodb-datasource` directory.
```bash
chmod 0755 mongodb-datasource/gpx_mongodb_datasource_*
```
* Create/start the docker container as descriped in the [example docker compose file](/docker-compose.prod.yaml)