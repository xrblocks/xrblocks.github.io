#!/bin/bash
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"
cd "${DIR}" || exit 1

SUBFOLDERS=(
    drone
)

npm list -g pnpm > /dev/null 2>&1 || npm i -g pnpm@latest
for folder in "${SUBFOLDERS[@]}"; do
    echo "Building $folder"
    (
        cd "$folder" &&
            pnpm install --frozen-lockfile &&
            pnpm build
    )
done
