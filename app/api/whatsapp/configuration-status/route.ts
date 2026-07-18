import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getBearerToken(request: Request) {
  const authorization = request.headers.get("authorization");

  return authorization?.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length).trim()
    : "";
}

function isConfigured(variableName: string) {
  return Boolean(process.env[variableName]?.trim());
}

export async function GET(request: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const accessToken = getBearerToken(request);

  if (!supabaseUrl || !supabaseAnonKey || !accessToken) {
    return Response.json(
      { message: "Hujaruhusiwa kuona configuration status." },
      { status: 401 }
    );
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  const { data: userData, error: userError } =
    await supabase.auth.getUser(accessToken);

  if (userError || !userData.user) {
    return Response.json(
      { message: "Session yako imeisha. Ingia tena." },
      { status: 401 }
    );
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userData.user.id)
    .maybeSingle();

  if (profileError) {
    return Response.json({ message: profileError.message }, { status: 500 });
  }

  if (profile?.role !== "admin") {
    return Response.json(
      { message: "Administrator pekee anaweza kuona configuration status." },
      { status: 403 }
    );
  }

  const accessTokenConfigured = isConfigured("WHATSAPP_ACCESS_TOKEN");
  const phoneNumberConfigured = isConfigured("WHATSAPP_PHONE_NUMBER_ID");
  const templateNamesConfigured =
    isConfigured("WHATSAPP_TEMPLATE_NAME_SW") ||
    isConfigured("WHATSAPP_TEMPLATE_NAME_EN");
  const webhookEnvironmentConfigured =
    isConfigured("WHATSAPP_VERIFY_TOKEN") &&
    isConfigured("META_APP_SECRET") &&
    isConfigured("SUPABASE_SERVICE_ROLE_KEY");

  return Response.json(
    {
      sendConfigurationDetected:
        accessTokenConfigured &&
        phoneNumberConfigured &&
        templateNamesConfigured,
      accessTokenConfigured,
      phoneNumberConfigured,
      templateNamesConfigured,
      webhookEnvironmentConfigured,
      metaVerification: "not_verified",
      templateApproval: "not_verified",
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}
