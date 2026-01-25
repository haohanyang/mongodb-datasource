package plugin

// MongoDB auth methods. Corresponds to src/types.ts MongoDBAuthMethod
const (
	mongoAuthNone             = ""
	mongoAuthUsernamePassword = "username-password"
	mongoAuthX509             = "x509"
)

const (
	tlsDefault  = ""
	tlsEnabled  = "enabled"
	tlsDisabled = "disabled"
)

const (
	variableTypeString  = ""
	variableTypeInteger = "integer"
	variableTypeDecimal = "decimal"
)
