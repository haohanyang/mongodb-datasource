package models

import (
	"fmt"
	"sync"
	"time"

	"github.com/grafana/grafana-plugin-sdk-go/data"
	"go.mongodb.org/mongo-driver/bson"
)

type Stream struct {
	mu     sync.Mutex
	Fields map[string]*data.Field
	Size   int
}

func (s *Stream) initValue(element bson.RawElement) error {
	key := element.Key()
	value := element.Value()
	var field *data.Field

	rowIndex := s.Size

	switch value.Type {
	case bson.TypeBoolean:
		field = data.NewField(key, nil, make([]*bool, rowIndex+1))
		field.Set(rowIndex, pointer(value.Boolean()))

	case bson.TypeInt32:
		// Convert int32 to int64
		field = data.NewField(key, nil, make([]*int64, rowIndex+1))
		field.Set(rowIndex, pointer(int64(value.Int32())))

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

	case bson.TypeTimestamp:
		t, _ := value.Timestamp()
		field = data.NewField(key, nil, make([]*time.Time, rowIndex+1))
		field.Set(rowIndex, pointer(time.Unix(int64(t), 0)))

	case bson.TypeObjectID:
		field = data.NewField(key, nil, make([]*string, rowIndex+1))
		field.Set(rowIndex, pointer(value.ObjectID().String()))

	case bson.TypeEmbeddedDocument:
		field = data.NewField(key, nil, make([]*string, rowIndex+1))

		v, err := rawDocToJson(value)
		if err != nil {
			return err
		}
		field.Set(rowIndex, &v)

	case bson.TypeArray:
		field = data.NewField(key, nil, make([]*string, rowIndex+1))

		v, err := rawArrayToJson(value)
		if err != nil {
			return err
		}
		field.Set(rowIndex, &v)

	default:
		field = data.NewField(key, nil, make([]*string, rowIndex+1))
		field.Set(rowIndex, pointer(fmt.Sprintf(UNSUPPORTED_TYPE, value.Type.String())))
	}

	s.Fields[key] = field
	return nil
}

func (s *Stream) AddValue(re bson.RawElement) error {

	s.mu.Lock()
	defer s.mu.Unlock()

	name := re.Key()
	rv := re.Value()

	if field, ok := s.Fields[name]; ok {
		switch rv.Type {
		case bson.TypeNull:
			field.Append(nil)

		case bson.TypeBoolean:
			if field.Type() != data.FieldTypeNullableBool {
				return fmt.Errorf("field %s should have type %s, but got %s", name, field.Type().ItemTypeString(), rv.Type.String())
			}

			field.Append(pointer(rv.Boolean()))

		case bson.TypeInt32:
			v := rv.Int32()

			if field.Type() == data.FieldTypeNullableInt64 {
				field.Append(pointer(int64(v)))
			} else {
				return fmt.Errorf("field %s should have type %s, but got %s", name, field.Type().ItemTypeString(), rv.Type.String())
			}
		case bson.TypeInt64:
			v := rv.Int64()

			if field.Type() == data.FieldTypeNullableInt64 {
				field.Append(pointer(v))
			} else {
				return fmt.Errorf("field %s should have type %s, but got %s", name, field.Type().ItemTypeString(), rv.Type.String())
			}

		case bson.TypeDouble:
			v := rv.Double()

			if field.Type() == data.FieldTypeNullableFloat64 {
				field.Append(pointer(v))
			} else {
				return fmt.Errorf("field %s should have type %s, but got %s", name, field.Type().ItemTypeString(), rv.Type.String())
			}

		case bson.TypeString:
			if field.Type() != data.FieldTypeNullableString {
				return fmt.Errorf("field %s should have type %s, but got %s", name, field.Type().ItemTypeString(), rv.Type.String())
			}

			field.Append(pointer(rv.StringValue()))

		case bson.TypeDateTime:
			if field.Type() != data.FieldTypeNullableTime {
				return fmt.Errorf("field %s should have type %s, but got %s", name, field.Type().ItemTypeString(), rv.Type.String())
			}

			field.Append(pointer(rv.Time()))

		case bson.TypeTimestamp:
			if field.Type() != data.FieldTypeNullableTime {
				return fmt.Errorf("field %s should have type %s, but got %s", name, field.Type().ItemTypeString(), rv.Type.String())
			}

			t, _ := rv.Timestamp()
			field.Append(pointer(time.Unix(int64(t), 0)))

		case bson.TypeObjectID:
			if field.Type() != data.FieldTypeNullableString {
				return fmt.Errorf("field %s should have type %s, but got %s", name, field.Type().ItemTypeString(), rv.Type.String())
			}
			field.Append(pointer(rv.ObjectID().String()))

		case bson.TypeEmbeddedDocument:
			if field.Type() != data.FieldTypeNullableString {
				return fmt.Errorf("field %s should have type %s, but got %s", name, field.Type().ItemTypeString(), rv.Type.String())
			}

			v, err := rawDocToJson(rv)
			if err != nil {
				return err
			}

			field.Append(&v)
		case bson.TypeArray:
			if field.Type() != data.FieldTypeNullableString {
				return fmt.Errorf("field %s should have type %s, but got %s", name, field.Type().ItemTypeString(), rv.Type.String())
			}

			v, err := rawArrayToJson(rv)
			if err != nil {
				return err
			}
			field.Append(&v)

		default:
			if field.Type() != data.FieldTypeNullableString {
				return fmt.Errorf("field %s should have type %s, but got %s", name, field.Type().ItemTypeString(), rv.Type.String())
			}

			field.Append(pointer(fmt.Sprintf(UNSUPPORTED_TYPE, rv.Type.String())))
		}

		return nil

	} else {
		return s.initValue(re)
	}
}
