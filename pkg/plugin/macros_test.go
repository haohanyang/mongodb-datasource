package plugin

import (
	"testing"
	"time"

	"github.com/grafana/grafana-plugin-sdk-go/backend"
)

func TestInterpolateTimeMacros(t *testing.T) {
	from := time.Date(2024, 1, 2, 3, 4, 5, 0, time.UTC)
	to := time.Date(2024, 1, 2, 4, 5, 6, 0, time.UTC)
	tr := backend.TimeRange{From: from, To: to}

	fromSec := "1704164645"
	toSec := "1704168306"
	fromMs := "1704164645000"
	fromISO := "2024-01-02T03:04:05.000Z"

	cases := []struct {
		name string
		in   string
		want string
	}{
		{"seconds", `${__from:date:seconds}`, fromSec},
		{"seconds to", `${__to:date:seconds}`, toSec},
		{"bare ms", `$__from`, fromMs},
		{"braced ms", `${__from}`, fromMs},
		{"iso explicit", `${__from:date:iso}`, fromISO},
		{"iso default", `${__from:date}`, fromISO},
		{"embedded in json", `{"$gt":{"$timestamp":{"t":${__from:date:seconds},"i":0}}}`,
			`{"$gt":{"$timestamp":{"t":` + fromSec + `,"i":0}}}`},
		{"both", `[${__from:date:seconds},${__to:date:seconds}]`, "[" + fromSec + "," + toSec + "]"},
		{"custom layout untouched", `${__from:date:YYYY-MM-DD}`, `${__from:date:YYYY-MM-DD}`},
		{"unrelated operators untouched", `{"$group":{"$sum":1}}`, `{"$group":{"$sum":1}}`},
		{"custom vars untouched", `${myVar} $__from_oid ${__local_from} ${__to_oid}`, `${myVar} $__from_oid ${__local_from} ${__to_oid}`},
		{"no macros", `{"a":1}`, `{"a":1}`},
	}

	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			got := interpolateTimeMacros(c.in, tr)
			if got != c.want {
				t.Errorf("interpolateTimeMacros(%q) = %q, want %q", c.in, got, c.want)
			}
		})
	}
}
