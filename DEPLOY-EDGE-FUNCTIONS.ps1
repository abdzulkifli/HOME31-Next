param(
  [Parameter(Mandatory=$true)][string]$ProjectRef,
  [Parameter(Mandatory=$true)][string]$GitHubUsername
)

$origin = "https://$GitHubUsername.github.io"
supabase login
supabase secrets set "ALLOWED_ORIGINS=$origin,http://localhost:8000,http://127.0.0.1:8000" --project-ref $ProjectRef
supabase functions deploy admin-create-user --project-ref $ProjectRef --no-verify-jwt --use-api
supabase functions deploy admin-reset-password --project-ref $ProjectRef --no-verify-jwt --use-api
supabase functions deploy change-own-password --project-ref $ProjectRef --no-verify-jwt --use-api
supabase functions list --project-ref $ProjectRef
