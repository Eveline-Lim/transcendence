#!/bin/sh
# Read Docker secrets (_FILE env vars) and export them as regular env vars
for var in $(env | grep '_FILE=' | cut -d= -f1); do
    base_var="${var%_FILE}"
    file_path="$(eval echo "\$$var")"
    if [ -f "$file_path" ]; then
        export "$base_var"="$(cat "$file_path" | tr -d '\n')"
    else
        echo "Warning: secret file $file_path not found for $var" >&2
    fi
done

exec "$@"
