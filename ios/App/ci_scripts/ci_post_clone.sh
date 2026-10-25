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

# Débloquer les restrictions de résolution de dépendances imposées par Xcode Cloud
defaults delete com.apple.dt.Xcode IDEDisableAutomaticPackageResolution 2>/dev/null || true
defaults delete com.apple.dt.Xcode IDEPackageOnlyUseVersionsFromResolvedFile 2>/dev/null || true
defaults write com.apple.dt.Xcode IDEDisableAutomaticPackageResolution -bool NO
defaults write com.apple.dt.Xcode IDEPackageOnlyUseVersionsFromResolvedFile -bool NO
defaults write com.apple.dt.Xcode IDESkipPackagePluginFingerprintValidatation -bool YES
defaults write com.apple.dt.Xcode IDESkipMacroFingerprintValidation -bool YES

# Supprimer l'ancien lockfile obsolète pour éviter l'erreur "out-of-date resolved file"
rm -f ios/App/App.xcodeproj/project.xcworkspace/xcshareddata/swiftpm/Package.resolved
rm -f ios/App/App.xcworkspace/xcshareddata/swiftpm/Package.resolved 2>/dev/null || true

# Résoudre et recréer un Package.resolved propre
xcodebuild -resolvePackageDependencies -project ios/App/App.xcodeproj -scheme App

