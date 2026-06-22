#!/bin/bash
set -e

echo "=== Harness Initialization ==="
echo "Working directory: $(pwd)"

echo "=== Installing workspace dependencies ==="
pnpm install

echo "=== Building backend ==="
pnpm --filter backend build

echo "=== Building admin ==="
pnpm --filter admin build

echo "=== Type-checking storefront ==="
pnpm --filter router-cf typecheck

echo "=== Building storefront ==="
pnpm --filter router-cf build

echo "=== Verification Complete ==="
echo ""
echo "Next steps:"
echo "1. Read feature_list.json to identify the single active feature"
echo "2. Update progress.md with actual command results"
echo "3. Work on one feature only"
echo "4. Re-run ./init.sh before claiming done"
