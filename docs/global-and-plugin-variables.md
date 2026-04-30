# Global Variables and Plugin Variables

## Global Variables

!!! info

    The content of this section is adapted from [AWS Docs](https://docs.aws.amazon.com/grafana/latest/userguide/variables-types.html#global-variables)

Grafana has global built-in variables that can be used in expressions in the query editor. This topic lists them in alphabetical order and defines them. These variables are useful in queries, dashboard links, panel links, and data links.

### $__dashboard

This variable is the name of the current dashboard.

### $__from and $__to

Grafana has two built in time range variables: `$__from` and `$__to`. They are currently always interpolated as epoch milliseconds by default but you can control date formatting.

|Syntax|Example result|Description|
|--- |--- |--- |
|`${__from}`|1594671549254|Unix millisecond epoch|
|`${__from:date}`|2020-07-13T20:19:09.254Z|No args, defaults to ISO 8601/RFC 3339|
|`${__from:date:iso}`|2020-07-13T20:19:09.254Z|ISO 8601/RFC 3339|
|`${__from:date:seconds}`|1594671549|Unix seconds epoch|
|`${__from:date:YYYY-MM}`|2020-07|Any custom data format. For more information, see [Display](https://momentjs.com/docs/#/displaying/).|

The above syntax works with ${__to} as well.

You can use this variable in URLs as well. For example, to send an end user to a dashboard that shows a time range from six hours ago until now, use the following URL: https://play.grafana.org/d/000000012/grafana-play-home?viewPanel=2&orgId=1?from=now-6h&to=now

### $__interval
You can use the `$__interval` variable as a parameter to group by time (for InfluxDB, Myself, Postgres, MSSQL), Date histogram interval (for OpenSearch), or as a summarize function parameter (for Graphite).

The Grafana workspace automatically calculates an interval that can be used to group by time in queries. When there are more data points than can be shown on a graph, queries can be made more efficient by grouping by a larger interval. For example, it is more efficient to group by 1 day than by 10s when looking at 3 months of data. The graph will look the same, and the query will be faster. The `$__interval` is calculated by using the time range and the width of the graph (the number of pixels).

Approximate Calculation: `(from - to) / resolution`

For example, when the time range is 1 hour and the graph is full screen, the interval might be calculated to 2m; points are grouped in 2-minute intervals. If the time range is 6 months and the graph is full screen, the interval might be 1d (1 day); points are grouped by day.

In the InfluxDB data source, the legacy variable `$interval` is the same variable. Use `$__interval` instead.

The InfluxDB and OpenSearch data sources have Group by time interval fields that are used to hardcode the interval or to set the minimum limit for the `$__interval` variable by using the `>` syntax -> `>10m`.

### $__org
This variable is the ID of the current organization. The variable `${__org.name}` is the name of the current organization.

### $__user
The variable `${__user.id}` is the ID of the current user. The variable `${__user.login}` is the login handle of the current user. The variable `${__user.email}` is the email for the current user.

## Plugin Variables
The plugin adds following variables:
### $__local_from and $__local_to
Beginning/end of time range in Unix millisecond epoch that respects local dashboard overrides, e.g., 1594671549254

### $__from_oid and $__to_oid
Mongo ObjectId that corresponds to the start/end of time range.

For example, if the dashboard query range starts at 2015-01-01 00:00:00 the following query
```json
{
  "$addFields": {
    "F": "$__from_oid"
  }
}
```
becomes
```json
{
  "$addFields": {
    "F": "54a47ff00000000000000000"
  }
}
```

Another useful example is to use `$__from_oid` and `$__to_oid` to filter field `_id`, which reflects the document creation time.

```json
[
  {
    "$match": {
      "_id": {
        "$gte": { "$oid": "$__from_oid" },
        "$lte": { "$oid": "$__to_oid" }
      }
    }
  }
]
```
### $__dateBucketCount
`dateBucketCount = Ceil((to - from) / interval_ms))` 