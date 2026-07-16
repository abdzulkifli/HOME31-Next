#!/usr/bin/env bash
set -euo pipefail
PROJECT_REF="${1:?Usage: ./DEPLOY-EDGE-FUNCTIONS.sh PROJECT_REF GITHUB_USERNAME}"
GITHUB_USERNAME="${2:?Usage: ./DEPLOY-EDGE-FUNCTIONS.sh PROJECT_REF GITHUB_USERNAME}"
ORIGIN="https://${GITHUB_USERNAME}.github.io"
supabase login
supabase secrets set "ALLOWED_ORIGINS=${ORIGIN},http://localhost:8000,http://127.0.0.1:8000" --project-ref "$PROJECT_REF"
supabase functions deploy admin-create-user --project-ref "$PROJECT_REF" --no-verify-jwt --use-api
supabase functions deploy admin-reset-password --project-ref "$PROJECT_REF" --no-verify-jwt --use-api
supabase functions deploy change-own-password --project-ref "$PROJECT_REF" --no-verify-jwt --use-api
supabase functions list --project-ref "$PROJECT_REF"
