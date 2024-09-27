package models

import (
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
	Size           int
}

func (c *Column) AppendValue(rv bson.RawValue) error {
	if rv.Type == bson.TypeNull {
		c.Field.Append(nil)
	} else {
		switch c.ValueType {
		case bson.TypeBoolean:
			if rv.Type != bson.TypeBoolean {
				return fmt.Errorf("field \"%s\" should have boolean type", c.Name)
			}

			v := new(bool)
			*v = rv.Boolean()
			c.Field.Append(v)

		case bson.TypeInt32:
			if rv.Type != bson.TypeInt32 {
				return fmt.Errorf("field \"%s\" should have int32 type", c.Name)
			}

			v := new(int32)
			*v = rv.Int32()
			c.Field.Append(v)

		case bson.TypeInt64:
			if rv.Type != bson.TypeInt64 {
				return fmt.Errorf("field \"%s\" should have int64 type", c.Name)
			}

			v := new(int64)
			*v = rv.Int64()
			c.Field.Append(v)

		case bson.TypeDouble:
			if rv.Type != bson.TypeDouble {
				return fmt.Errorf("field \"%s\" should have double type", c.Name)
			}

			v := new(float64)
			*v = rv.Double()
			c.Field.Append(v)

		case bson.TypeString:
			if rv.Type != bson.TypeString {
				return fmt.Errorf("field \"%s\" should have string type", c.Name)
			}

			v := new(string)
			*v = rv.StringValue()
			c.Field.Append(v)

		case bson.TypeDateTime:
			if rv.Type != bson.TypeDateTime {
				return fmt.Errorf("field \"%s\" should have datetime type", c.Name)
			}

			v := new(time.Time)
			*v = rv.Time()
			c.Field.Append(v)

		case bson.TypeObjectID:
			if rv.Type != bson.TypeObjectID {
				return fmt.Errorf("field \"%s\" should have objectId type", c.Name)
			}

			v := new(string)
			*v = rv.ObjectID().String()
			c.Field.Append(v)

		default:
			v := new(string)
			*v = rv.String()
			c.Field.Append(v)
		}
	}

	c.Size++
	return nil
}

func NewColumn(rowIndex int, element bson.RawElement) *Column {
	key := element.Key()
	value := element.Value()
	savedAsString := false
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

		savedAsString = true

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

		savedAsString = true
	default:
		field = data.NewField(key, nil, make([]*string, rowIndex+1))
		v := new(string)
		*v = value.String()
		field.Set(rowIndex, v)

		savedAsString = true
	}

	return &Column{
		Name:           key,
		ValueType:      value.Type,
		StoredAsString: savedAsString,
		Field:          field,
		Size:           rowIndex + 1,
	}
}
