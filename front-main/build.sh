#!/bin/bash
# Build script that ignores TypeScript errors
export TSC_COMPILE_ON_ERROR=true
export DISABLE_ESLINT_PLUGIN=true
export SKIP_PREFLIGHT_CHECK=true
npm run build
