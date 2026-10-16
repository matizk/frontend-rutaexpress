#!/bin/sh
set -eu
# Reject configuration injection before Nginx starts; never print the supplied value.
case "$BFF_UPSTREAM" in
    *[!a-zA-Z0-9:/._~-]*|'')
        echo >&2 "BFF_UPSTREAM invalido: usa el BFF local o una URL HTTPS sin credenciales ni parametros."
        exit 1 ;;
esac
if [ "$BFF_UPSTREAM" != "http://bff:8080" ] &&
   ! printf '%s\n' "$BFF_UPSTREAM" | grep -Eq '^https://[A-Za-z0-9.-]+(:443)?(/[A-Za-z0-9._~-]+)*$'; then
    echo >&2 "BFF_UPSTREAM invalido: el destino externo debe usar HTTPS y no terminar en /."
    exit 1
fi
