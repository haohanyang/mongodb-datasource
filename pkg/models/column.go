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
	Name           string
	ValueType      bsontype.Type
	StoredAsString bool
	Field          *data.Field
	NullValueCount int
}

func (c *Column) AppendValue(rv bson.RawValue) error {
	switch rv.Type {
	case bson.TypeNull:
		c.Field.Append(nil)
		c.NullValueCount++

	case bson.TypeBoolean:
		if c.ValueType != bson.TypeBoolean {
			return fmt.Errorf("field \"%s\" should have %s type", c.Name, c.ValueType.String())
		}

		v := new(bool)
		*v = rv.Boolean()
		c.Field.Append(v)

	case bson.TypeInt32:
		if c.ValueType != bson.TypeInt32 {
			return fmt.Errorf("field \"%s\" should have %s type", c.Name, c.ValueType.String())
		}

		v := new(int32)
		*v = rv.Int32()
		c.Field.Append(v)

	case bson.TypeInt64:
		if c.ValueType != bson.TypeInt64 {
			return fmt.Errorf("field \"%s\" should have %s type", c.Name, c.ValueType.String())
		}

		v := new(int64)
		*v = rv.Int64()
		c.Field.Append(v)

	case bson.TypeDouble:
		if c.ValueType != bson.TypeDouble {
			return fmt.Errorf("field \"%s\" should have %s type", c.Name, c.ValueType.String())
		}

		v := new(float64)
		*v = rv.Double()
		c.Field.Append(v)

	case bson.TypeString:
		if c.ValueType != bson.TypeString {
			return fmt.Errorf("field \"%s\" should have %s type", c.Name, c.ValueType.String())
		}

		v := new(string)
		*v = rv.StringValue()
		c.Field.Append(v)

	case bson.TypeDateTime:
		if c.ValueType != bson.TypeDateTime {
			return fmt.Errorf("field \"%s\" should have %s type", c.Name, c.ValueType.String())
		}

		v := new(time.Time)
		*v = rv.Time()
		c.Field.Append(v)

	case bson.TypeObjectID:
		if c.ValueType != bson.TypeObjectID {
			return fmt.Errorf("field \"%s\" should have %s type", c.Name, c.ValueType.String())
		}

		v := new(string)
		*v = rv.ObjectID().String()
		c.Field.Append(v)

	case bson.TypeEmbeddedDocument:
		if c.ValueType != bson.TypeEmbeddedDocument && c.ValueType != bson.TypeArray {
			return fmt.Errorf("field \"%s\" should have %s type", c.Name, c.ValueType.String())
		}

		v := new(json.RawMessage)
		*v = json.RawMessage([]byte(rv.Document().String()))

		c.Field.Append(v)
	case bson.TypeArray:
		if c.ValueType != bson.TypeArray && c.ValueType != bson.TypeEmbeddedDocument {
			return fmt.Errorf("field \"%s\" should have %s type", c.Name, c.ValueType.String())
		}

		v := new(json.RawMessage)
		*v = json.RawMessage([]byte(rv.Array().String()))

		c.Field.Append(v)
	default:
		v := new(string)
		*v = rv.String()
		c.Field.Append(v)
	}

	return nil
}

func (c *Column) Size() int {
	return c.Field.Len()
}

func NewColumn(rowIndex int, element bson.RawElement) *Column {
	key := element.Key()
	value := element.Value()
	storedAsString := false
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

		storedAsString = true

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

		storedAsString = true

	case bson.TypeEmbeddedDocument:
		field = data.NewField(key, nil, make([]*json.RawMessage, rowIndex+1))
		v := new(json.RawMessage)
		*v = json.RawMessage([]byte(value.Document().String()))
		field.Set(rowIndex, v)

		storedAsString = false

	case bson.TypeArray:
		field = data.NewField(key, nil, make([]*json.RawMessage, rowIndex+1))
		v := new(json.RawMessage)
		*v = json.RawMessage([]byte(value.Array().String()))
		field.Set(rowIndex, v)

		storedAsString = false
	default:
		field = data.NewField(key, nil, make([]*string, rowIndex+1))
		v := new(string)
		*v = value.String()
		field.Set(rowIndex, v)

		storedAsString = true
	}

	return &Column{
		Name:           key,
		ValueType:      value.Type,
		StoredAsString: storedAsString,
		Field:          field,
		NullValueCount: rowIndex,
	}
}
