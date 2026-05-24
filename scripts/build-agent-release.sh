#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT_DIR="$ROOT_DIR/dist/agent"
REQUESTED_TAG="${1:-}"
AGENT_VERSION="$(sed -nE "s/.*AGENT_VERSION[[:space:]]*=[[:space:]]*['\"]([^'\"]+)['\"].*/\1/p" "$ROOT_DIR/shared/versions.ts" | head -n 1)"
if [ -z "$AGENT_VERSION" ]; then
  echo "[agent] AGENT_VERSION not found in shared/versions.ts" >&2
  exit 1
fi
VERSION="${AGENT_VERSION#v}"
if [ -n "$REQUESTED_TAG" ] && [ "${REQUESTED_TAG#v}" != "$VERSION" ]; then
  echo "[agent] release tag ${REQUESTED_TAG} detected; building Agent version ${VERSION} from shared/versions.ts"
fi

mkdir -p "$OUT_DIR"

build_one() {
  local goarch="$1"
  local out="$2"
  echo "[agent] building linux/$goarch -> $out"
  (
    cd "$ROOT_DIR/agent"
    CGO_ENABLED=0 GOOS=linux GOARCH="$goarch" \
      go build -trimpath -ldflags "-s -w -X main.Version=$VERSION" -o "$OUT_DIR/$out" .
  )
}

build_one amd64 forwardx-agent-linux-amd64
build_one arm64 forwardx-agent-linux-arm64

build_fxp() {
  local goarch="$1"
  local out="$2"
  echo "[fxp] building linux/$goarch -> $out"
  (
    cd "$ROOT_DIR/forwardx-fxp"
    CGO_ENABLED=0 GOOS=linux GOARCH="$goarch" \
      go build -trimpath -ldflags "-s -w" -o "$OUT_DIR/$out" .
  )
}

build_fxp amd64 forwardx-fxp-linux-amd64
build_fxp arm64 forwardx-fxp-linux-arm64

artifacts=("$OUT_DIR"/forwardx-agent-linux-*)
if compgen -G "$OUT_DIR/forwardx-fxp-linux-*" >/dev/null; then
  artifacts+=("$OUT_DIR"/forwardx-fxp-linux-*)
fi
sha256sum "${artifacts[@]}" > "$OUT_DIR"/SHA256SUMS

echo "[agent] release artifacts:"
ls -lh "$OUT_DIR"
