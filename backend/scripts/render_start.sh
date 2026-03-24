#!/usr/bin/env sh
set -eu

DATA_DIR="${PARAGRAF_DATA_DIR:-/var/data}"
TEMPLATE_DIR="$DATA_DIR/templates"
OUTPUT_DIR="${OUTPUT_DIR:-$DATA_DIR/output/contracts}"
BACKUP_DIR="${BACKUP_DIR:-$DATA_DIR/backups}"
CHROMA_DIR="${CHROMADB_PATH:-$DATA_DIR/chromadb}"
BUNDLED_TEMPLATE="/app/templates/Umowa_B2B_draft_2026_od_02.03.2026.docx"
TARGET_TEMPLATE="${TEMPLATE_PATH:-$TEMPLATE_DIR/Umowa_B2B_draft_2026_od_02.03.2026.docx}"
BUNDLED_DB="/app/bootstrap/paragraf.db"
TARGET_DB="$DATA_DIR/paragraf.db"
BUNDLED_CHROMA_DIR="/app/bootstrap/chromadb"
BUNDLED_CONTRACTS_DIR="/app/bootstrap/contracts"
FORCE_BOOTSTRAP="${FORCE_BOOTSTRAP:-false}"

mkdir -p "$DATA_DIR" "$TEMPLATE_DIR" "$OUTPUT_DIR" "$BACKUP_DIR" "$CHROMA_DIR"
mkdir -p "$DATA_DIR/output/contracts/annexes" "$DATA_DIR/output/contracts/terminations" "$DATA_DIR/output/contracts/versions"

if [ -f "$BUNDLED_TEMPLATE" ] && { [ ! -f "$TARGET_TEMPLATE" ] || [ "$FORCE_BOOTSTRAP" = "true" ]; }; then
  cp "$BUNDLED_TEMPLATE" "$TARGET_TEMPLATE"
fi

if [ -f "$BUNDLED_DB" ] && { [ ! -f "$TARGET_DB" ] || [ "$FORCE_BOOTSTRAP" = "true" ]; }; then
  cp "$BUNDLED_DB" "$TARGET_DB"
fi

if [ -d "$BUNDLED_CHROMA_DIR" ] && { [ -z "$(ls -A "$CHROMA_DIR" 2>/dev/null || true)" ] || [ "$FORCE_BOOTSTRAP" = "true" ]; }; then
  rm -rf "$CHROMA_DIR"/*
  cp -R "$BUNDLED_CHROMA_DIR"/. "$CHROMA_DIR"/
fi

if [ -d "$BUNDLED_CONTRACTS_DIR" ] && { [ -z "$(ls -A "$OUTPUT_DIR" 2>/dev/null || true)" ] || [ "$FORCE_BOOTSTRAP" = "true" ]; }; then
  cp -R "$BUNDLED_CONTRACTS_DIR"/. "$OUTPUT_DIR"/
fi

exec uvicorn main:app --host 0.0.0.0 --port "${PORT:-8001}"
