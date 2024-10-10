package models

import (
	"encoding/json"
	"fmt"
	"time"

	"github.com/grafana/grafana-plugin-sdk-go/data"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/bsontype"
)

type Column struct {
	Name      string
	Field     *data.Field
	BsonTypes []bsontype.Type
}

var UNSUPPORTED_TYPE = "[Unsupported type]"

func (c *Column) AppendValue(rv bson.RawValue) error {
	switch rv.Type {
	case bson.TypeNull:
		c.Field.Append(nil)

	case bson.TypeBoolean:
		if c.Type() != data.FieldTypeNullableBool {
			return fmt.Errorf("field %s should have type %s, but got %s", c.Name, c.Type().ItemTypeString(), rv.Type.String())
		}

		v := new(bool)
		*v = rv.Boolean()
		c.Field.Append(v)

	case bson.TypeInt32:
		v := rv.Int32()
		if c.Type() == data.FieldTypeNullableInt32 {
			c.Field.Append(pointer(v))

		} else if c.Type() == data.FieldTypeNullableInt64 {
			c.Field.Append(pointer(int64(v)))

		} else if c.Type() == data.FieldTypeNullableFloat64 {
			c.Field.Append(pointer(float64(v)))

		} else {
			return fmt.Errorf("field %s should have type %s, but got %s", c.Name, c.Type().ItemTypeString(), rv.Type.String())
		}
	case bson.TypeInt64:
		v := rv.Int64()

		if c.Type() == data.FieldTypeNullableInt64 {
			c.Field.Append(pointer(v))
		} else if c.Type() == data.FieldTypeNullableInt32 {
			// Convert all previous *int32 values to *int64
			int64Values := make([]*int64, c.Field.Len()+1)
			for i := 0; i < c.Field.Len(); i++ {
				cv, ok := c.Field.ConcreteAt(i)
				if ok {
					int64Values[i] = pointer(int64(cv.(int32)))
				}
			}

			int64Values[c.Field.Len()] = pointer(v)
			c.Field = data.NewField(c.Name, nil, int64Values)

		} else if c.Type() == data.FieldTypeNullableFloat64 {
			c.Field.Append(pointer(float64(v)))

		} else {
			return fmt.Errorf("field %s should have type %s, but got %s", c.Name, c.Type().ItemTypeString(), rv.Type.String())
		}

	case bson.TypeDouble:
		v := rv.Double()

		if c.Type() == data.FieldTypeNullableFloat64 {
			c.Field.Append(pointer(v))
		} else if c.Type() == data.FieldTypeNullableInt32 {
			// Convert all previous *int32 values to *float64
			float64Values := make([]*float64, c.Field.Len()+1)
			for i := 0; i < c.Field.Len(); i++ {
				cv, ok := c.Field.ConcreteAt(i)
				if ok {
					float64Values[i] = pointer(float64(cv.(int32)))
				}
			}

			float64Values[c.Field.Len()] = pointer(v)
			c.Field = data.NewField(c.Name, nil, float64Values)

		} else if c.Type() == data.FieldTypeNullableInt64 {
			// Convert all previous *int64 values to *float64
			float64Values := make([]*float64, c.Field.Len()+1)
			for i := 0; i < c.Field.Len(); i++ {
				cv, ok := c.Field.ConcreteAt(i)
				if ok {
					float64Values[i] = pointer(float64(cv.(int64)))
				}
			}

			float64Values[c.Field.Len()] = pointer(v)
			c.Field = data.NewField(c.Name, nil, float64Values)
		} else {
			return fmt.Errorf("field %s should have type %s, but got %s", c.Name, c.Type().ItemTypeString(), rv.Type.String())
		}

	case bson.TypeString:
		if c.Type() != data.FieldTypeNullableString {
			return fmt.Errorf("field %s should have type %s, but got %s", c.Name, c.Type().ItemTypeString(), rv.Type.String())
		}

		c.Field.Append(pointer(rv.StringValue()))

	case bson.TypeDateTime:
		if c.Type() != data.FieldTypeNullableTime {
			return fmt.Errorf("field %s should have type %s, but got %s", c.Name, c.Type().ItemTypeString(), rv.Type.String())
		}

		c.Field.Append(pointer(rv.Time()))

	case bson.TypeObjectID:
		if c.Type() != data.FieldTypeNullableString {
			return fmt.Errorf("field %s should have type %s, but got %s", c.Name, c.Type().ItemTypeString(), rv.Type.String())
		}
		c.Field.Append(pointer(rv.ObjectID().String()))

	case bson.TypeEmbeddedDocument:
		if c.Type() != data.FieldTypeNullableString {
			return fmt.Errorf("field %s should have type %s, but got %s", c.Name, c.Type().ItemTypeString(), rv.Type.String())
		}

		c.Field.Append(pointer(rv.Document().String()))
	case bson.TypeArray:
		if c.Type() != data.FieldTypeNullableString {
			return fmt.Errorf("field %s should have type %s, but got %s", c.Name, c.Type().ItemTypeString(), rv.Type.String())
		}

		c.Field.Append(pointer(rv.Array().String()))

	default:
		if c.Type() != data.FieldTypeNullableString {
			return fmt.Errorf("field %s should have type %s, but got %s", c.Name, c.Type().ItemTypeString(), rv.Type.String())
		}

		c.Field.Append(pointer(UNSUPPORTED_TYPE))
	}

	c.BsonTypes = append(c.BsonTypes, rv.Type)
	return nil
}

func (c *Column) Size() int {
	return c.Field.Len()
}

func (c *Column) Type() data.FieldType {
	return c.Field.Type()
}

func NewColumn(rowIndex int, element bson.RawElement) *Column {
	key := element.Key()
	value := element.Value()
	var field *data.Field

	switch value.Type {
	case bson.TypeBoolean:
		field = data.NewField(key, nil, make([]*bool, rowIndex+1))
		field.Set(rowIndex, pointer(value.Boolean()))

	case bson.TypeInt32:
		field = data.NewField(key, nil, make([]*int32, rowIndex+1))
		field.Set(rowIndex, pointer(value.Int32()))

	case bson.TypeInt64:
		field = data.NewField(key, nil, make([]*int64, rowIndex+1))
		field.Set(rowIndex, pointer(value.Int64()))

	case bson.TypeDouble:
		field = data.NewField(key, nil, make([]*float64, rowIndex+1))
		field.Set(rowIndex, pointer(value.Double()))

	case bson.TypeString:
		field = data.NewField(key, nil, make([]*string, rowIndex+1))
		field.Set(rowIndex, pointer(value.StringValue()))

	case bson.TypeDateTime:
		field = data.NewField(key, nil, make([]*time.Time, rowIndex+1))
		field.Set(rowIndex, pointer(value.Time()))

	case bson.TypeObjectID:
		field = data.NewField(key, nil, make([]*string, rowIndex+1))
		field.Set(rowIndex, pointer(value.ObjectID().String()))

	case bson.TypeEmbeddedDocument:
		field = data.NewField(key, nil, make([]*string, rowIndex+1))
		field.Set(rowIndex, pointer(value.Document().String()))

	case bson.TypeArray:
		field = data.NewField(key, nil, make([]*string, rowIndex+1))
		field.Set(rowIndex, pointer(value.Array().String()))

	default:
		field = data.NewField(key, nil, make([]*string, rowIndex+1))
		field.Set(rowIndex, pointer(UNSUPPORTED_TYPE))
	}

	return &Column{
		Name:      key,
		Field:     field,
		BsonTypes: []bsontype.Type{value.Type},
	}
}

// Convert array and embedded document type values to json.RawMessage if allowed
func (c *Column) Rectify() {
	convertToRawJson := true

	for _, typ := range c.BsonTypes {
		if typ != bson.TypeArray && typ != bson.TypeEmbeddedDocument && typ != bson.TypeNull {
			convertToRawJson = false
			break
		}
	}

	if convertToRawJson {
		jsons := make([]*json.RawMessage, c.Field.Len())
		for i := 0; i < c.Field.Len(); i++ {
			v, ok := c.Field.ConcreteAt(i)
			if ok {
				jsons[i] = pointer(json.RawMessage([]byte(v.(string))))
			}
		}

		c.Field = data.NewField(c.Name, nil, jsons)
	}
}
