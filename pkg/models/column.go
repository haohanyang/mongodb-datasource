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
	ValueType bsontype.Type
	Field     *data.Field
}

func (c *Column) AppendValue(rv bson.RawValue) error {
	switch rv.Type {
	case bson.TypeNull:
		c.Field.Append(nil)

	case bson.TypeBoolean:
		if c.ValueType != bson.TypeBoolean {
			return fmt.Errorf("field %s should have type %s", c.Name, c.ValueType.String())
		}

		v := new(bool)
		*v = rv.Boolean()
		c.Field.Append(v)

	case bson.TypeInt32:
		v := rv.Int32()
		if c.ValueType == bson.TypeInt32 {
			c.Field.Append(pointer(v))

		} else if c.ValueType == bson.TypeInt64 {
			c.Field.Append(pointer(int64(v)))

		} else if c.ValueType == bson.TypeDouble {
			c.Field.Append(pointer(float64(v)))

		} else {
			return fmt.Errorf("field %s should have type %s", c.Name, c.ValueType.String())
		}
	case bson.TypeInt64:
		v := rv.Int64()

		if c.ValueType == bson.TypeInt64 {
			c.Field.Append(pointer(v))
		} else if c.ValueType == bson.TypeInt32 {
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
			c.ValueType = rv.Type

		} else if c.ValueType == bson.TypeDouble {
			c.Field.Append(pointer(float64(v)))

		} else {
			return fmt.Errorf("field %s should have type %s", c.Name, c.ValueType.String())
		}

	case bson.TypeDouble:
		v := rv.Double()

		if c.ValueType == bson.TypeDouble {
			c.Field.Append(pointer(v))
		} else if c.ValueType == bson.TypeInt32 {
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
			c.ValueType = rv.Type

		} else if c.ValueType == bson.TypeInt64 {
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
			c.ValueType = rv.Type
		}

		if c.ValueType != bson.TypeDouble {
			return fmt.Errorf("field %s should have type %s", c.Name, c.ValueType.String())
		}

	case bson.TypeString:
		if c.ValueType != bson.TypeString {
			return fmt.Errorf("field %s should have type %s", c.Name, c.ValueType.String())
		}

		c.Field.Append(pointer(rv.StringValue()))

	case bson.TypeDateTime:
		if c.ValueType != bson.TypeDateTime {
			return fmt.Errorf("field %s should have type %s", c.Name, c.ValueType.String())
		}

		c.Field.Append(pointer(rv.Time()))

	case bson.TypeObjectID:
		if c.ValueType != bson.TypeObjectID {
			return fmt.Errorf("field %s should have type %s", c.Name, c.ValueType.String())
		}

		c.Field.Append(pointer(rv.ObjectID().String()))

	case bson.TypeEmbeddedDocument:
		if c.ValueType != bson.TypeEmbeddedDocument && c.ValueType != bson.TypeArray {
			return fmt.Errorf("field %s should have type %s", c.Name, c.ValueType.String())
		}

		c.Field.Append(pointer(json.RawMessage([]byte(rv.Document().String()))))
	case bson.TypeArray:
		if c.ValueType != bson.TypeArray && c.ValueType != bson.TypeEmbeddedDocument {
			return fmt.Errorf("field %s should have type %s", c.Name, c.ValueType.String())
		}

		c.Field.Append(pointer(json.RawMessage([]byte(rv.Array().String()))))
	default:
		c.Field.Append(pointer(rv.String()))
	}

	return nil
}

func (c *Column) Size() int {
	return c.Field.Len()
}

func NewColumn(rowIndex int, element bson.RawElement) *Column {
	key := element.Key()
	value := element.Value()
	var field *data.Field

	switch value.Type {
	case bson.TypeBoolean:
		field = data.NewField(key, nil, make([]*bool, rowIndex+1))
		v := new(bool)
		*v = value.Boolean()
		field.Set(rowIndex, v)

	case bson.TypeInt32:
		field = data.NewField(key, nil, make([]*int32, rowIndex+1))
		v := new(int32)
		*v = value.Int32()
		field.Set(rowIndex, v)

	case bson.TypeInt64:
		field = data.NewField(key, nil, make([]*int64, rowIndex+1))
		v := new(int64)
		*v = value.Int64()
		field.Set(rowIndex, v)

	case bson.TypeDouble:
		field = data.NewField(key, nil, make([]*float64, rowIndex+1))
		v := new(float64)
		*v = value.Double()
		field.Set(rowIndex, v)

	case bson.TypeString:
		field = data.NewField(key, nil, make([]*string, rowIndex+1))
		v := new(string)
		*v = value.StringValue()
		field.Set(rowIndex, v)

	case bson.TypeDateTime:
		field = data.NewField(key, nil, make([]*time.Time, rowIndex+1))
		v := new(time.Time)
		*v = value.Time()
		field.Set(rowIndex, v)

	case bson.TypeObjectID:
		field = data.NewField(key, nil, make([]*string, rowIndex+1))
		v := new(string)
		*v = value.ObjectID().String()
		field.Set(rowIndex, v)

	case bson.TypeEmbeddedDocument:
		field = data.NewField(key, nil, make([]*json.RawMessage, rowIndex+1))
		v := new(json.RawMessage)
		*v = json.RawMessage([]byte(value.Document().String()))
		field.Set(rowIndex, v)

	case bson.TypeArray:
		field = data.NewField(key, nil, make([]*json.RawMessage, rowIndex+1))
		v := new(json.RawMessage)
		*v = json.RawMessage([]byte(value.Array().String()))
		field.Set(rowIndex, v)

	default:
		field = data.NewField(key, nil, make([]*string, rowIndex+1))
		v := new(string)
		*v = value.String()
		field.Set(rowIndex, v)

	}

	return &Column{
		Name:      key,
		ValueType: value.Type,
		Field:     field,
	}
}
