#!/bin/sh

set -eu

REPOSITORY_PATH="$(cd "$(dirname "$0")/../../.." && pwd)"
cd "$REPOSITORY_PATH"

brew install node@22
export PATH="$(brew --prefix node@22)/bin:$PATH"

node --version
npm install
npm run build
npx cap sync ios
