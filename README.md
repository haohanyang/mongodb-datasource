# Grafana MongoDB Data Source

![ci](https://github.com/haohanyang/mongodb-datasource/actions/workflows/ci.yml/badge.svg?branch=master)

Integrate MongoDB to Grafana. A free, open source, community-driven alternative to Grafana Lab's MongoDB enterprise plugin and MongoDB Atlas Charts.

一个开源的可视化MongoDB数据库的Grafana插件。

This plugin enables you to query and visualize data from your MongoDB databases directly within Grafana. Leverage the flexibility of MongoDB's aggregation pipeline to create insightful dashboards and panels.

![screenshot](/static/screenshot-2.png)

## Features

- **Flexible Querying:** Query data using MongoDB's aggregation pipeline syntax in JSON or JavaScript. Support query variables to create dynamic dashboards.
- **Time Series & Table Data:** Visualize time-based data or display results in tabular format for various Grafana panels.
- **MongoDB Atlas Support** Connect to MongoDB Atlas Services.
- **Grafana Alerting Support** Set up alerting rules based on query result
- **[Legacy Plugin](https://github.com/JamesOsgood/mongodb-grafana) Compatibility:** Easy migrate from the [legacy plugin](https://github.com/JamesOsgood/mongodb-grafana) with support for its query syntax.

## Authentication methods
* No authentication
* Username/Password authentication

## Getting Started
### Quick start
Run the script [quick_start.py](scripts/quick_start.py) in the root directory to start MongoDB and Grafana containers with the plugin
```
python3 scripts/quick_start.py
```
### Full steps
1. **Download:** Obtain the latest plugin build from the [Release page](https://github.com/haohanyang/mongodb-datasource/releases) or [workflow artifacts](https://github.com/haohanyang/mongodb-datasource/actions?query=branch%3Amaster).

2. **Install:** 
   - Extract the downloaded archive (`haohanyang-mongodb-datasource-<version>.zip`) into your Grafana plugins directory (`/var/lib/grafana/plugins` or similar).
   - Ensure the plugin binaries (`mongodb-datasource/gpx_mongodb_datasource_*`) have execute permissions (`chmod +x`).
   - Configure the plugin as a data source within Grafana, providing your MongoDB connection details.

Refer to the [example docker-compose.prod.yaml](/docker-compose.prod.yaml) file for a production-ready setup. 
    
3. **Start Querying:** 
    - Select your MongoDB data source in a Grafana panel.
    - Use the query editor to write your aggregation pipeline queries (see Query Language below).

## Query Language

### JSON (Recommended)

Provide the collection name and your MongoDB aggregation pipeline in standard JSON format.

**Example:** Retrieve 10 AirBnB listings scraped within the selected time range:
```json
[
    {
        "$match": {
            "last_scraped": {
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
            }
        }
    },
    {
        "$limit": 10
    }
]
```

### JavaScript (Legacy & ShadowRealm)

- **Legacy:** Maintain compatibility with the [legacy plugin](https://github.com/JamesOsgood/mongodb-grafana)'s syntax: 
    ```javascript
    db.listingsAndReviews.aggregate([ /* Your aggregation pipeline (JSON) */ ]); 
    ```
   This gives the same result as the previous JSON query.
	```js
	db.listingsAndReviews.aggregate([
	    {
	        "$match": {
	            "last_scraped": {
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
	            }
	        }
	    },
	    {
	        "$limit": 10
	    }
	])
	```
- **ShadowRealm (Secure):** Define an `aggregate()` function that returns your pipeline. The function executes within a [ShadowRealm](https://github.com/tc39/proposal-shadowrealm) sandboxed environment. 
	```javascript
	function aggregate() {
	   // ... your logic based on template variables ...
	   return [ /* Your aggregation pipeline */ ]; 
	}
	```
    In this example, only the admin user to can view the query result.
	```js
	function aggregate() {
	    const user = "${__user.login}"
	    let filter = {}
	    if (user !== "admin") {
	        filter = {
	            noop: true
	        }
	    }
	    return [
	        {
	            $match: filter
	        },
	        {
	            $limit: 10
	        }
	    ]
	}
	```

### Query Types

- **Time series:**  For time-based visualizations. Your query must return documents with `ts` (timestamp) and `value` fields. An optional `name` field enables grouping by category.

  The following query of [Sample AirBnB Listings Dataset](https://www.mongodb.com/docs/atlas/sample-data/sample-airbnb/) shows the number of AirBnB listings in each month that have the first review in the selected time range.
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
- **Table:** For more flexible data display in tables, pie charts, etc. No specific output schema is required.

## Supported Data Types

| BSON Type             | Support | Go Type           | Notes                                   |
|-----------------------|---------|-------------------|-------------------------------------------|
| Double               | ✅       | float64           |                                           |
| String               | ✅       | string           |                                           |
| Object               | ✅       | json.RawMessage  | May be converted to string if necessary |
| Array                | ✅       | json.RawMessage  | May be converted to string if necessary |
| ObjectId             | ✅       | string           |                                           |
| Boolean              | ✅       | bool              |                                           |
| Date                 | ✅       | time.Time         |                                           |
| Null                 | ✅       | nil              |                                           |
| 32-bit integer      | ✅       | int32            | May be converted to int64/float64        |
| 64-bit integer      | ✅       | int64            | May be converted to float64             |

 **Note:** Unsupported BSON types are not included in the table and will display as `"[Unsupported type]"`.

## License
[Apache-2.0](/LICENSE)