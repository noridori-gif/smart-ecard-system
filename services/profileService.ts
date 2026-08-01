import {
  createClient,
} from "@/lib/supabase/client";

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
  authentication_type:"EMAIL"|"PHONE"|"USERNAME";
  login_email:string|null;
  login_phone:string|null;
  login_username:string|null;
  force_password_change:boolean;
};

export type CurrentUserProfile =
  UserProfile & {
    email: string;
  };

export type CreateManagedUserInput = {
  full_name: string;
  username:string;
  email?: string;
  phone?: string;
  password: string;
  force_password_change:boolean;

  role:
    | "organizer"
    | "scanner";
};

type CreateManagedUserResponse = {
  message?: string;
  error?: string;
  profile?: UserProfile;
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
  } =
    await supabase.auth.getUser();

  if (userError) {
    throw new Error(
      userError.message
    );
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
      ,authentication_type,login_email,login_phone,login_username,force_password_change
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
    email:
      user.email ?? "",
  };
}

export async function getAllUserProfiles(): Promise<
  UserProfile[]
> {
  const supabase =
    getSupabaseClient();

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
      ,authentication_type,login_email,login_phone,login_username,force_password_change
    `)
    .order(
      "created_at",
      {
        ascending: false,
      }
    );

  if (error) {
    throw new Error(
      error.message
    );
  }

  return (
    data ?? []
  ) as UserProfile[];
}

export async function updateUserRole(
  userId: string,
  role: UserRole
): Promise<UserProfile> {
  const supabase =
    getSupabaseClient();

  const {
    data,
    error,
  } = await supabase
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
      ,authentication_type,login_email,login_phone,login_username,force_password_change
    `)
    .single();

  if (error) {
    throw new Error(
      error.message
    );
  }

  return data as UserProfile;
}

export async function updateUserActiveStatus(
  userId: string,
  isActive: boolean
): Promise<UserProfile> {
  const supabase =
    getSupabaseClient();

  const {
    data,
    error,
  } = await supabase
    .from("profiles")
    .update({
      is_active:
        isActive,

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
      ,authentication_type,login_email,login_phone,login_username,force_password_change
    `)
    .single();

  if (error) {
    throw new Error(
      error.message
    );
  }

  return data as UserProfile;
}

export async function createManagedUser(
  input: CreateManagedUserInput
): Promise<UserProfile> {
  const supabase =
    getSupabaseClient();

  const {
    data: { session },
    error: sessionError,
  } =
    await supabase.auth.getSession();

  if (sessionError) {
    throw new Error(
      sessionError.message
    );
  }

  if (
    !session?.access_token
  ) {
    throw new Error(
      "Session haijapatikana. Tafadhali login tena."
    );
  }

  const response =
    await fetch(
      "/api/admin/users",
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",

          Authorization:
            `Bearer ${session.access_token}`,
        },

        body:
          JSON.stringify({
            full_name:
              input.full_name
                .trim(),

            username:input.username?.trim().toLowerCase(),
            email:input.email?.trim().toLowerCase(),
            phone:input.phone?.trim(),

            password:
              input.password,

            role:
              input.role,
            force_password_change:input.force_password_change,
          }),
      }
    );

  let result:
    CreateManagedUserResponse;

  try {
    result =
      (await response.json()) as
        CreateManagedUserResponse;
  } catch {
    throw new Error(
      "Server imerudisha response isiyo sahihi."
    );
  }

  if (
    !response.ok ||
    !result.profile
  ) {
    throw new Error(
      result.error ||
        "User hakuweza kutengenezwa."
    );
  }

  return result.profile;
}

export async function resetManagedUserPassword(userId:string,password:string){const supabase=getSupabaseClient();const {data:{session}}=await supabase.auth.getSession();if(!session?.access_token)throw new Error("Session haijapatikana.");const response=await fetch("/api/admin/users",{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${session.access_token}`},body:JSON.stringify({action:"reset_password",user_id:userId,password})});const result=await response.json() as {message?:string;error?:string};if(!response.ok)throw new Error(result.error??"Password reset failed.");return result.message??"Temporary password updated.";}

export async function deleteManagedUser(userId:string,confirmation:string,adminPassword:string){const supabase=getSupabaseClient();const {data:{session}}=await supabase.auth.getSession();if(!session?.access_token)throw new Error("Session haijapatikana.");const response=await fetch(`/api/admin/users/${userId}`,{method:"DELETE",headers:{"Content-Type":"application/json",Authorization:`Bearer ${session.access_token}`},cache:"no-store",body:JSON.stringify({confirmation,adminPassword})});const text=await response.text();let result:{success?:boolean;error?:string}={};if(text&&response.headers.get("content-type")?.includes("application/json")){try{result=JSON.parse(text) as typeof result;}catch{}}if(!response.ok||!result.success)throw new Error(result.error??"delete-failed");}
