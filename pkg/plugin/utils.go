package plugin

import (
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
				fmt.Print(v)
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
