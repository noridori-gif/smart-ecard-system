import { createClient as createAdminClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

const noStoreHeaders = {
  "Cache-Control": "no-store, max-age=0",
};

function json(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: noStoreHeaders,
  });
}

function developmentLog(
  message: string,
  details: Record<string, unknown>
) {
  if (process.env.NODE_ENV === "development") {
    console.info(message, details);
  }
}

export async function POST(request: Request) {
  try {
    let body: {
      currentPassword?: string;
      newPassword?: string;
    };

    try {
      body = await request.json();
    } catch {
      return json({ success: false, error: "password-change-failed" }, 400);
    }

    if (
      !body.currentPassword ||
      !body.newPassword ||
      body.newPassword.length < 8 ||
      body.currentPassword === body.newPassword
    ) {
      return json({ success: false, error: "password-change-failed" }, 400);
    }

    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user?.email) {
      return json({ success: false, error: "password-change-failed" }, 401);
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return json({ success: false, error: "password-change-failed" }, 500);
    }

    const admin = createAdminClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: profileBefore, error: beforeError } = await admin
      .from("profiles")
      .select("id,force_password_change")
      .eq("id", user.id)
      .maybeSingle();

    if (beforeError || !profileBefore) {
      developmentLog("Password change profile lookup failed", {
        userId: user.id,
        databaseError: beforeError
          ? { code: beforeError.code, message: beforeError.message }
          : "profile-not-found",
      });
      return json({ success: false, error: "password-change-failed" }, 500);
    }

    developmentLog("Password change profile state before update", {
      userId: user.id,
      forcePasswordChange: profileBefore.force_password_change,
    });

    const { error: verifyError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: body.currentPassword,
    });

    if (verifyError) {
      return json({ success: false, error: "invalid-current-password" }, 400);
    }

    const { error: updateError } = await supabase.auth.updateUser({
      password: body.newPassword,
    });

    if (updateError) {
      return json({ success: false, error: "password-change-failed" }, 400);
    }

    const { data: updatedProfiles, error: profileError } = await admin
      .from("profiles")
      .update({
        force_password_change: false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id)
      .select("id,force_password_change");
    const affectedRows = updatedProfiles?.length ?? 0;
    const profileAfter = updatedProfiles?.[0] ?? null;

    developmentLog("Password change profile state after update", {
      userId: user.id,
      affectedRows,
      forcePasswordChange: profileAfter?.force_password_change ?? null,
      databaseError: profileError
        ? { code: profileError.code, message: profileError.message }
        : null,
    });

    if (
      profileError ||
      affectedRows !== 1 ||
      profileAfter?.id !== user.id ||
      profileAfter.force_password_change !== false
    ) {
      return json(
        {
          success: false,
          error: "password-updated-profile-reconciliation-required",
        },
        409
      );
    }

    const { error: refreshError } = await supabase.auth.refreshSession();

    if (refreshError) {
      developmentLog("Password change session refresh failed", {
        userId: user.id,
        authError: {
          name: refreshError.name,
          message: refreshError.message,
        },
      });
      return json(
        { success: false, error: "password-updated-session-refresh-required" },
        409
      );
    }

    return json({ success: true, redirectTo: "/dashboard" });
  } catch (error) {
    developmentLog("Change password route failed", {
      error: error instanceof Error ? error.message : "unknown-error",
    });
    return json({ success: false, error: "password-change-failed" }, 500);
  }
}
