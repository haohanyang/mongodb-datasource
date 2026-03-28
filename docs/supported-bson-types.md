# Supported BSON Types

The plugin supports showing a reasonal subset of BSON types. Unsupported BSON types are not included in the table and will display as `[Unsupported type]`.

| BSON Type      | Support | Go Type         | Notes                                   |
| -------------- | ------- | --------------- | --------------------------------------- |
| Double         | ✅      | float64         |                                         |
| String         | ✅      | string          |                                         |
| Object         | ✅      | json.RawMessage | May be converted to string if necessary |
| Array          | ✅      | json.RawMessage | May be converted to string if necessary |
| ObjectId       | ✅      | string          |                                         |
| Boolean        | ✅      | bool            |                                         |
| Date           | ✅      | time.Time       |                                         |
| Null           | ✅      | nil             |                                         |
| 32-bit integer | ✅      | int32           | May be converted to int64/float64       |
| 64-bit integer | ✅      | int64           | May be converted to float64             |
| Timestamps     | ✅      | time.Time       | The `ordinal` part is truncated         |