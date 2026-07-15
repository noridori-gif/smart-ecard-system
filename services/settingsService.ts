import {
  supabase,
} from "@/lib/supabase";

export type UserSettingsProfile = {
  id: string;
  fullName: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

type ProfileRecord = {
  id: string;
  full_name: string | null;
  role: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

async function getAuthenticatedUser() {
  const {
    data,
    error,
  } = await supabase.auth.getUser();

  if (error) {
    throw new Error(
      error.message
    );
  }

  if (!data.user) {
    throw new Error(
      "Session yako imeisha. Ingia tena."
    );
  }

  return data.user;
}

export async function getUserSettingsProfile(): Promise<
  UserSettingsProfile
> {
  const user =
    await getAuthenticatedUser();

  const {
    data,
    error,
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
    .eq(
      "id",
      user.id
    )
    .single();

  if (error) {
    throw new Error(
      error.message
    );
  }

  const profile =
    data as ProfileRecord;

  return {
    id: profile.id,

    fullName:
      profile.full_name ??
      user.user_metadata
        ?.full_name ??
      "User",

    email:
      user.email ?? "",

    role:
      profile.role,

    isActive:
      profile.is_active,

    createdAt:
      profile.created_at,

    updatedAt:
      profile.updated_at,
  };
}

export async function updateProfileName(
  fullName: string
) {
  const cleanedFullName =
    fullName.trim();

  if (
    cleanedFullName.length < 2
  ) {
    throw new Error(
      "Jina lazima liwe na angalau herufi mbili."
    );
  }

  const user =
    await getAuthenticatedUser();

  const updatedAt =
    new Date().toISOString();

  const {
    error: profileError,
  } = await supabase
    .from("profiles")
    .update({
      full_name:
        cleanedFullName,

      updated_at:
        updatedAt,
    })
    .eq(
      "id",
      user.id
    );

  if (profileError) {
    throw new Error(
      profileError.message
    );
  }

  const {
    error: authError,
  } =
    await supabase.auth.updateUser({
      data: {
        full_name:
          cleanedFullName,
      },
    });

  if (authError) {
    throw new Error(
      authError.message
    );
  }

  return {
    fullName:
      cleanedFullName,

    updatedAt,
  };
}

export async function updateAccountPassword(
  newPassword: string,
  confirmPassword: string
) {
  if (
    newPassword.length < 8
  ) {
    throw new Error(
      "Password lazima iwe na angalau characters 8."
    );
  }

  if (
    newPassword !==
    confirmPassword
  ) {
    throw new Error(
      "Passwords hazifanani."
    );
  }

  const {
    error,
  } =
    await supabase.auth.updateUser({
      password:
        newPassword,
    });

  if (error) {
    throw new Error(
      error.message
    );
  }
}

export async function logoutCurrentUser() {
  const {
    error,
  } =
    await supabase.auth.signOut();

  if (error) {
    throw new Error(
      error.message
    );
  }
}