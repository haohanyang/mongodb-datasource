package plugin

import (
	"regexp"
	"strconv"
	"strings"

	"github.com/grafana/grafana-plugin-sdk-go/backend"
)

// timeMacroRegex matches Grafana global time macros in either bare ($__from) or
// braced (${__from:date:seconds}) form.
//
//	sub[1] = bare field ("from"/"to"), empty for braced form
//	sub[2] = braced field ("from"/"to"), empty for bare form
//	sub[3] = ":date" when the date modifier is present, empty otherwise
//	sub[4] = format token after :date ("seconds", "iso", or a custom layout)
var timeMacroRegex = regexp.MustCompile(`\$(?:__(from|to)\b|\{__(from|to)(:date)?(?::([^}]+))?\})`)

// interpolateTimeMacros replaces Grafana global time macros ($__from / $__to and
// their :date / :date:iso / :date:seconds variants) with values derived from the
// query time range.
//
// Grafana only interpolates these macros in the frontend (see
// MongoDBDataSource.applyTemplateVariables). Alert-rule evaluation runs entirely
// server-side and never calls that code, so the raw "${__from...}" text reaches
// the backend and breaks Extended JSON parsing on the leading "$". This mirrors
// the frontend's raw text substitution (no added quotes), so it is a no-op for
// dashboard/Explore queries where the tokens were already replaced.
func interpolateTimeMacros(queryText string, tr backend.TimeRange) string {
	return timeMacroRegex.ReplaceAllStringFunc(queryText, func(match string) string {
		sub := timeMacroRegex.FindStringSubmatch(match)

		bare := sub[1]
		braced := sub[2]
		hasDate := sub[3] != ""
		format := sub[4]

		field := bare
		if field == "" {
			field = braced
		}

		t := tr.From
		if field == "to" {
			t = tr.To
		}

		// Bare $__from / $__to and braced ${__from} without :date -> epoch ms.
		if bare != "" || !hasDate {
			return strconv.FormatInt(t.UnixMilli(), 10)
		}

		switch strings.ToLower(format) {
		case "seconds":
			return strconv.FormatInt(t.Unix(), 10)
		case "", "iso":
			// ${__from:date} and ${__from:date:iso} -> ISO 8601 in UTC.
			return t.UTC().Format("2006-01-02T15:04:05.000Z07:00")
		default:
			// Custom momentjs layouts aren't supported server-side; leave the
			// macro untouched rather than emit a wrong value.
			return match
		}
	})
}
