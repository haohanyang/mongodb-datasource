# Changelog

## 0.3.2 - 2025-05-17

### Added

- More autocomplete support.
- IntelliSense: Hover on stage operator will display stage description and parameters. CodeLens on stage operator with "Delete" action. Editor validaton that displays warning if query is invalid.

### Changed

- Editor UI was updated to resemble the standard SQL editor

## 0.3.1 - 2025-02-18

### Added

- Added query editor aggregation stage autocomplete. Enter `$` when the cursor is inside brackets `{}` and you will get a list of stage operators to select.
- Added annotation query support
- Added new variables `$__from_oid` and `$__to_oid` which are Mongo ObjectIds generated from the panel's current time range

## 0.3.0 - 2025-01-11

### Added

- Added Live Streaming support based on [Mongo Change Streams](https://www.mongodb.com/docs/manual/changeStreams/)(https://github.com/haohanyang/mongodb-datasource/pull/31)

### Changed

- Removed "Query" button. Built-in Query/Refresh button is recommended instead(https://github.com/haohanyang/mongodb-datasource/pull/31)

## 0.2.1 - 2024-12-14

### Added

- Optional Mongo aggregate options(https://github.com/haohanyang/mongodb-datasource/pull/33)
- Query Button(https://github.com/haohanyang/mongodb-datasource/pull/35)

### Changed

- Query won't be executed automatically after focus changes. User needs to manually click buttons(https://github.com/haohanyang/mongodb-datasource/pull/35)
- UI improvement(https://github.com/haohanyang/mongodb-datasource/pull/33)

## 0.2.0 - 2024-12-06

### Added

- Enabled Grafana Alerting([67358d5c](https://github.com/haohanyang/mongodb-datasource/commit/67358d5cb1ada5571697de21016f2acf5dbc1234))

### Changed

- Improved query variable([#28](https://github.com/haohanyang/mongodb-datasource/pull/28))

## 0.1.2 - 2024-11-10

### Changed

- Increased code editor's font size([84c7de5d](https://github.com/haohanyang/mongodb-datasource/commit/84c7de5df5035bd4c3214908eb6a389b53732cde))
- Make `_id` the first column in the table if exists([#26](https://github.com/haohanyang/mongodb-datasource/pull/26))
- Fix BSON array conversion to JSON([#25](https://github.com/haohanyang/mongodb-datasource/pull/25))

## 0.1.1 - 2024-10-25

### Added

- [Query Variable](https://grafana.com/docs/grafana/latest/dashboards/variables/add-template-variables/#add-a-query-variable) support
- A quick start script `quick_start.py` to quickly start Grafana and MongoDB containers

### Changed

- Added "(Optinal)" to connection string configuration tooltip

## 0.1.0 - 2024-10-13

Initial release.
