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

  const { data: { user }, error: userError } = await callerClient.auth.getUser();
  if (userError || !user) return respond(request, { error: "Invalid or expired session." }, 401);

  const { data: profile, error: profileError } = await adminClient
    .from("profiles")
    .select("account_status")
    .eq("id", user.id)
    .maybeSingle();
  if (profileError) return respond(request, { error: "Unable to verify account status." }, 500);
  if (profile?.account_status !== "active") return respond(request, { error: "The account is not active." }, 403);

  let payload: Record<string, unknown>;
  try {
    payload = await request.json();
  } catch {
    return respond(request, { error: "Invalid JSON request body." }, 400);
  }
  const password = String(payload.password ?? "");
  if (!isStrongPassword(password)) {
    return respond(request, {
      error: "Password must contain at least 10 characters with uppercase, lowercase, number and symbol."
    }, 400);
  }

  const { error: passwordError } = await adminClient.auth.admin.updateUserById(user.id, { password });
  if (passwordError) return respond(request, { error: passwordError.message }, 400);

  const changedAt = new Date().toISOString();
  const { error: updateProfileError } = await adminClient.from("profiles").update({
    must_change_password: false,
    password_changed_at: changedAt,
    updated_at: changedAt
  }).eq("id", user.id);

  if (updateProfileError) {
    return respond(request, {
      error: "The password changed, but the profile status could not be updated. Retry with the same password or contact an administrator."
    }, 500);
  }

  return respond(request, { ok: true, message: "Password updated successfully." });
});
