# Copied from https://github.com/grafana/plugin-actions/blob/d381e10ef234721a03e28af8017e290dc225e945/package-plugin/pm.sh
#!/bin/bash

# Check if command argument is provided
if [ "$1" = "" ]; then
	echo "Please provide a command to run."
	exit 1
fi

install_pnpm_if_not_present() {
    if ! command -v pnpm &> /dev/null
    then
        echo "pnpm could not be found, installing..."
        npm install -g pnpm
    fi
}

# Detect the package manager
if [ -f yarn.lock ]; then
	pm="yarn"
elif [ -f pnpm-lock.yaml ]; then
	install_pnpm_if_not_present
	pm="pnpm"
elif [ -f package-lock.json ]; then
	pm="npm"
else
	echo "No recognized package manager found in this project."
	exit 1
fi

# Run the provided command with the detected package manager
echo "Running '$1' with $pm..."
if [ "$1" = "install" ]; then
	"$pm" install
else
	"$pm" run "$1"
fi