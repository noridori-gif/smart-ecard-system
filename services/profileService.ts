import { createClient } from "@/lib/supabase/client";

export type UserRole =
  | "admin"
  | "organizer"
  | "scanner";

export type UserProfile = {
  id: string;
  full_name: string | null;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type CurrentUserProfile = UserProfile & {
  email: string;
};

function getSupabaseClient() {
  return createClient();
}

export function getRoleLabel(
  role: UserRole
) {
  if (role === "admin") {
    return "Administrator";
  }

  if (role === "organizer") {
    return "Event Organizer";
  }

  return "Event Scanner";
}

export function canManageUsers(
  role: UserRole
) {
  return role === "admin";
}

export function canManageEvents(
  role: UserRole
) {
  return (
    role === "admin" ||
    role === "organizer"
  );
}

export function canViewReports(
  role: UserRole
) {
  return (
    role === "admin" ||
    role === "organizer"
  );
}

export function canScanGuests(
  role: UserRole
) {
  return (
    role === "admin" ||
    role === "organizer" ||
    role === "scanner"
  );
}

export async function getCurrentUserProfile(): Promise<
  CurrentUserProfile | null
> {
  const supabase =
    getSupabaseClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    throw new Error(userError.message);
  }

  if (!user) {
    return null;
  }

  const {
    data: profile,
    error: profileError,
  } = await supabase
    .from("profiles")
    .select(`
      id,
      full_name,
      role,
      is_active,
      created_at,
      updated_at
    `)
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    throw new Error(
      profileError.message
    );
  }

  if (!profile) {
    throw new Error(
      "Profile ya user haijapatikana."
    );
  }

  return {
    ...(profile as UserProfile),
    email: user.email ?? "",
  };
}

export async function getAllUserProfiles(): Promise<
  UserProfile[]
> {
  const supabase =
    getSupabaseClient();

  const { data, error } = await supabase
    .from("profiles")
    .select(`
      id,
      full_name,
      role,
      is_active,
      created_at,
      updated_at
    `)
    .order("created_at", {
      ascending: false,
    });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as UserProfile[];
}

export async function updateUserRole(
  userId: string,
  role: UserRole
): Promise<UserProfile> {
  const supabase =
    getSupabaseClient();

  const { data, error } = await supabase
    .from("profiles")
    .update({
      role,
      updated_at:
        new Date().toISOString(),
    })
    .eq("id", userId)
    .select(`
      id,
      full_name,
      role,
      is_active,
      created_at,
      updated_at
    `)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as UserProfile;
}

export async function updateUserActiveStatus(
  userId: string,
  isActive: boolean
): Promise<UserProfile> {
  const supabase =
    getSupabaseClient();

  const { data, error } = await supabase
    .from("profiles")
    .update({
      is_active: isActive,
      updated_at:
        new Date().toISOString(),
    })
    .eq("id", userId)
    .select(`
      id,
      full_name,
      role,
      is_active,
      created_at,
      updated_at
    `)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as UserProfile;
}