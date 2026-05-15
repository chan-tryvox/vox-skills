#!/usr/bin/env bash
# vox.ai install script for Claude Code (CLI / IDE) and Codex CLI.
#
# One-line usage:
#   curl -fsSL https://raw.githubusercontent.com/vox-public/vox-skills/main/install.sh | bash
#
# Specify target explicitly:
#   curl -fsSL https://raw.githubusercontent.com/vox-public/vox-skills/main/install.sh | bash -s -- claude
#   curl -fsSL https://raw.githubusercontent.com/vox-public/vox-skills/main/install.sh | bash -s -- codex
#   curl -fsSL https://raw.githubusercontent.com/vox-public/vox-skills/main/install.sh | bash -s -- both
#
# Target defaults to "auto": installs for every supported CLI it finds in PATH.

set -euo pipefail

TARGET="${1:-auto}"

c_red=$'\033[31m'; c_green=$'\033[32m'; c_cyan=$'\033[36m'; c_dim=$'\033[2m'; c_reset=$'\033[0m'
err()  { printf '%serror:%s %s\n' "$c_red" "$c_reset" "$*" >&2; }
log()  { printf '%s✓%s %s\n' "$c_green" "$c_reset" "$*"; }
info() { printf '%s→%s %s\n' "$c_cyan" "$c_reset" "$*"; }
dim()  { printf '%s%s%s\n' "$c_dim" "$*" "$c_reset"; }

install_claude() {
  if ! command -v claude >/dev/null 2>&1; then
    err "claude CLI not found in PATH. Install Claude Code first: https://claude.com/code"
    return 1
  fi
  if ! claude --version >/dev/null 2>&1; then
    err "claude is not runnable in this environment."
    return 1
  fi
  info "Installing vox.ai for Claude Code…"
  claude plugin marketplace add vox-public/vox-skills
  claude plugin install vox-ai@vox-ai
  log "vox.ai plugin installed for Claude Code."
  echo
  info "Next steps in your Claude Code chat:"
  dim "    /reload-plugins              # load plugin into the current session"
  dim "    /vox-ai:vox-onboarding       # start the first voice agent"
}

install_codex() {
  if ! command -v codex >/dev/null 2>&1; then
    err "codex CLI not found in PATH. Install OpenAI Codex CLI first."
    return 1
  fi
  if ! codex --version >/dev/null 2>&1; then
    err "codex is not runnable in this environment."
    return 1
  fi
  info "Registering vox.ai marketplace for Codex CLI…"
  codex plugin marketplace add vox-public/vox-skills
  log "vox.ai marketplace registered for Codex."
  echo
  info "Next steps in Codex CLI:"
  dim "    /plugin                      # install vox-ai from the list"
  dim "    restart codex-cli"
  dim "    \$vox-ai:vox-onboarding       # start the first voice agent"
}

case "$TARGET" in
  claude|claude-code)
    install_claude
    ;;
  codex|codex-cli)
    install_codex
    ;;
  both|all)
    install_claude || true
    echo
    install_codex || true
    ;;
  auto)
    found=0
    if command -v claude >/dev/null 2>&1; then
      install_claude && found=1 || true
    fi
    if command -v codex >/dev/null 2>&1; then
      echo
      install_codex && found=1 || true
    fi
    if [ "$found" = "0" ]; then
      err "Neither claude nor codex CLI found. Install one of them first."
      exit 1
    fi
    ;;
  *)
    err "Unknown target: $TARGET"
    echo "Usage: install.sh [claude|codex|both|auto]"
    exit 1
    ;;
esac

echo
log "Done. Authenticate via OAuth on first vox MCP tool call."
dim "  Docs: https://docs.tryvox.co/docs/ai/overview"
