#!/bin/sh
set -e

# Xcode Cloud runs this right after cloning, before Xcode touches the project.
#
# It has to exist because a clone alone can't build this app. Three of the
# build's inputs are generated rather than committed:
#
#   * node_modules — ios/App/CapApp-SPM/Package.swift resolves 7 of its 8
#     dependencies through relative paths into it, so without this the build
#     fails at "Resolve Package Graph" before compiling anything.
#   * ios/App/App/public — the web assets copied from webDir.
#   * ios/App/App/capacitor.config.json — the config the bridge reads at launch,
#     including server.url and the native plugin list.
#
# `cap sync ios` produces the last two and rewrites Package.swift to match
# whatever plugins package.json currently declares.

echo "=== ci_post_clone.sh running from $(pwd) ==="
cd "$CI_PRIMARY_REPOSITORY_PATH"
echo "repository root: $(pwd)"

# Xcode Cloud looks for ci_scripts beside the Xcode project, so this script is
# checked in at both the repo root and ios/App/. Whichever one runs first does
# the work; the other sees node_modules already there and returns.
if [ -d node_modules/@capacitor/app ]; then
  echo "node_modules already populated — nothing to do"
  exit 0
fi

# Not every Xcode Cloud image ships Node; install only when it's actually absent
# so the common case stays fast.
if ! command -v node >/dev/null 2>&1; then
  echo "Node not found on the image — installing via Homebrew"
  export HOMEBREW_NO_AUTO_UPDATE=1
  brew install node
fi

echo "node $(node -v), npm $(npm -v)"

# package.json runs `prisma generate` on postinstall, and prisma.config.ts reads
# DATABASE_URL. Nothing here connects to a database — the client only needs a
# syntactically valid URL to generate against, so a local file stub is enough
# and keeps real credentials out of the CI environment.
export DATABASE_URL="${DATABASE_URL:-file:./dev.db}"

npm ci
npx cap sync ios

echo "=== post-clone complete ==="
ls -d node_modules/@capacitor/app ios/App/App/public ios/App/App/capacitor.config.json
