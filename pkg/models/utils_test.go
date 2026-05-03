package models

import (
	"strings"
	"testing"

	"go.mongodb.org/mongo-driver/bson"
)

// Regression for the bsoncore formatDouble bug: rendering a BSON document
// containing a double like 2e-05 used to go through value.String(), which
// produced {"$numberDouble":"2E-05.0"} (note the trailing ".0" after "E-05")
// and then failed to round-trip through bson.UnmarshalExtJSON with
//
//	error decoding key X: strconv.ParseFloat: parsing "2E-05.0": invalid syntax
func TestRawDocToJson_SmallScientificDoubleRoundTrips(t *testing.T) {
	docBytes, err := bson.Marshal(bson.M{
		"sub": bson.M{
			"value":       2e-05,
			"lower_value": 0.000019,
			"upper_value": 5e-200,
			"integer_d":   1.0,
			"plain":       0.123,
		},
	})
	if err != nil {
		t.Fatalf("bson.Marshal: %v", err)
	}

	rv := bson.Raw(docBytes).Lookup("sub")
	out, err := rawDocToJson(rv)
	if err != nil {
		t.Fatalf("rawDocToJson returned error for small double: %v", err)
	}
	for _, want := range []string{`"value":0.00002`, `"lower_value":0.000019`, `"upper_value":5e-200`} {
		if !strings.Contains(out, want) {
			t.Errorf("output %q missing %q", out, want)
		}
	}
	if strings.Contains(out, "E-05.0") || strings.Contains(out, ".0e") {
		t.Errorf("output %q contains malformed scientific-notation float", out)
	}
}

func TestRawArrayToJson_SmallScientificDoubleRoundTrips(t *testing.T) {
	docBytes, err := bson.Marshal(bson.M{
		"arr": bson.A{2e-05, 0.5, 1.0, 1e+200},
	})
	if err != nil {
		t.Fatalf("bson.Marshal: %v", err)
	}

	rv := bson.Raw(docBytes).Lookup("arr")
	out, err := rawArrayToJson(rv)
	if err != nil {
		t.Fatalf("rawArrayToJson returned error: %v", err)
	}
	for _, want := range []string{"0.00002", "0.5", "1e+200"} {
		if !strings.Contains(out, want) {
			t.Errorf("output %q missing %q", out, want)
		}
	}
}
