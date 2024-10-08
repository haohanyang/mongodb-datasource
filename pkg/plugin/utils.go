package plugin

import (
	"encoding/json"
	"fmt"

	"github.com/grafana/grafana-plugin-sdk-go/data"
)

func PrintDataFrame(dataFrame *data.Frame) {
	// Print headers
	fmt.Print("|")
	for i, field := range dataFrame.Fields {
		fmt.Print(field.Name)
		if i < len(dataFrame.Fields)-1 {
			fmt.Print(",")
		}
	}
	fmt.Println("|")

	// Print data
	for i := 0; i < dataFrame.Rows(); i++ {
		fmt.Print("|")
		for j, field := range dataFrame.Fields {
			v, ok := field.ConcreteAt(i)

			if ok {
				if field.Type() == data.FieldTypeNullableJSON {
					rm := v.(json.RawMessage)
					rb, err := rm.MarshalJSON()
					if err != nil {
						panic(err)
					}
					fmt.Print(string(rb))
				} else if field.Type() == data.FieldTypeNullableString {
					s := v.(string)
					if len(s) > 10 {
						fmt.Print(s[:10] + "...")
					} else {
						fmt.Print(s)
					}
				} else {
					fmt.Print(v)
				}
			} else {
				fmt.Print("null")
			}

			if j < len(dataFrame.Fields)-1 {
				fmt.Print(",")
			}
		}
		fmt.Println("|")
	}
}

func pointer[K any](val K) *K {
	return &val
}
func null[K any]() *K {
	var nullValue *K
	return nullValue
}
