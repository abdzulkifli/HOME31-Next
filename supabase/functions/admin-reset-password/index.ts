import { createClient } from "npm:@supabase/supabase-js@2.49.8";

function keyFromCollection(collectionName: string, legacyName: string): string | null {
  const collection = Deno.env.get(collectionName);
  if (collection) {
    try {
      const parsed = JSON.parse(collection) as Record<string, string>;
      return parsed.default || Object.values(parsed).find(Boolean) || null;
    } catch {
      // Fall through to the legacy key while Supabase completes key migration.
    }
  }
  return Deno.env.get(legacyName) || null;
}

const defaultAllowedOrigins = [
  "https://abdzulkifli.github.io",
  "http://localhost:8000",
  "http://127.0.0.1:8000"
];

function allowedOrigins(): string[] {
  const configured = Deno.env.get("ALLOWED_ORIGINS");
  return configured
    ? configured.split(",").map(value => value.trim()).filter(Boolean)
    : defaultAllowedOrigins;
}

function corsHeaders(request: Request): HeadersInit {
  const origin = request.headers.get("Origin") || "";
  const allowed = allowedOrigins();
  return {
    "Access-Control-Allow-Origin": allowed.includes(origin) ? origin : allowed[0],
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin"
  };
}

function respond(request: Request, body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(request), "Content-Type": "application/json" }
  });
}

function isStrongPassword(password: string): boolean {
  return password.length >= 10 &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /\d/.test(password) &&
    /[^A-Za-z0-9]/.test(password);
}

Deno.serve(async request => {
  const origin = request.headers.get("Origin");
  if (origin && !allowedOrigins().includes(origin)) {
    return respond(request, { error: "Origin not allowed." }, 403);
  }
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(request) });
  if (request.method !== "POST") return respond(request, { error: "Method not allowed." }, 405);

  const authorization = request.headers.get("Authorization");
  if (!authorization) return respond(request, { error: "Missing authorization token." }, 401);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const publicKey = keyFromCollection("SUPABASE_PUBLISHABLE_KEYS", "SUPABASE_ANON_KEY");
  const secretKey = keyFromCollection("SUPABASE_SECRET_KEYS", "SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !publicKey || !secretKey) {
    return respond(request, { error: "Function environment is incomplete." }, 500);
  }

  const callerClient = createClient(supabaseUrl, publicKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false }
  });
  const adminClient = createClient(supabaseUrl, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  const { data: { user: caller }, error: callerError } = await callerClient.auth.getUser();
  if (callerError || !caller) return respond(request, { error: "Invalid or expired session." }, 401);

  const { data: profile, error: profileError } = await adminClient
    .from("profiles")
    .select("role, account_status, must_change_password")
    .eq("id", caller.id)
    .maybeSingle();
  if (profileError) return respond(request, { error: "Unable to verify administrator access." }, 500);
  if (profile?.role !== "super_admin" || profile?.account_status !== "active" || profile?.must_change_password) {
    return respond(request, { error: "Active super-admin access required." }, 403);
  }

  let payload: Record<string, unknown>;
  try {
    payload = await request.json();
  } catch {
    return respond(request, { error: "Invalid JSON request body." }, 400);
  }
  const targetUserId = String(payload.user_id ?? "");
  const temporaryPassword = String(payload.password ?? "");

  if (!targetUserId) return respond(request, { error: "User ID is required." }, 400);
  if (targetUserId === caller.id) {
    return respond(request, { error: "Use My Account to change your own password." }, 400);
  }
  if (!isStrongPassword(temporaryPassword)) {
    return respond(request, {
      error: "Temporary password must contain at least 10 characters with uppercase, lowercase, number and symbol."
    }, 400);
  }

  const { data: targetProfile, error: targetProfileError } = await adminClient
    .from("profiles")
    .select("account_status")
    .eq("id", targetUserId)
    .maybeSingle();
  if (targetProfileError || !targetProfile) return respond(request, { error: "Target profile not found." }, 404);
  if (targetProfile.account_status !== "active") {
    return respond(request, { error: "Activate the account before assigning a temporary password." }, 400);
  }

  const { error: updateError } = await adminClient.auth.admin.updateUserById(
    targetUserId,
    { password: temporaryPassword }
  );
  if (updateError) return respond(request, { error: updateError.message }, 400);

  const { error: statusError } = await adminClient.from("profiles").update({
    must_change_password: true,
    password_changed_at: null,
    updated_at: new Date().toISOString()
  }).eq("id", targetUserId);

  if (statusError) {
    return respond(request, {
      error: "The temporary password changed, but the first-login status could not be updated. Contact the system administrator."
    }, 500);
  }

  return respond(request, {
    ok: true,
    message: "Temporary password assigned. The user must change it at next login."
  });
});
