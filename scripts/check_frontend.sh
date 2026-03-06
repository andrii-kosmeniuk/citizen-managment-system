#!/usr/bin/env bash
set -euo pipefail

cd frontend
npm run lint
npm run test
npm run build
