import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";

type AllowedRole =
  | "organizer"
  | "scanner";

type CreateUserRequest = {
  action?:"reset_password";
  user_id?:string;
  full_name?: string;
  username?:string;
  email?: string;
  phone?: string;
  password?: string;
  role?: AllowedRole;
  force_password_change?: boolean;
};

const allowedRoles: AllowedRole[] = [
  "organizer",
  "scanner",
];

function normalizeTanzanianPhone(value:string){const digits=value.replace(/\D/g,"");const national=digits.startsWith("255")?digits.slice(3):digits.startsWith("0")?digits.slice(1):digits;return /^[67]\d{8}$/.test(national)?`+255${national}`:"";}
function normalizeUsername(value:string){const normalized=value.trim().toLowerCase();return /^[a-z0-9][a-z0-9._-]{3,29}$/.test(normalized)?normalized:"";}

function getBearerToken(
  request: Request
) {
  const authorization =
    request.headers.get("authorization");

  if (
    !authorization ||
    !authorization.startsWith("Bearer ")
  ) {
    return "";
  }

  return authorization
    .slice("Bearer ".length)
    .trim();
}

export async function POST(
  request: Request
) {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL;

  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (
    !supabaseUrl ||
    !serviceRoleKey
  ) {
    return NextResponse.json(
      {
        error:
          "Supabase server configuration haijakamilika.",
      },
      {
        status: 500,
      }
    );
  }

  const accessToken =
    getBearerToken(request);

  if (!accessToken) {
    return NextResponse.json(
      {
        error:
          "Authentication token haijapatikana.",
      },
      {
        status: 401,
      }
    );
  }

  const adminClient =
    createClient(
      supabaseUrl,
      serviceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

  const {
    data: { user: requestingUser },
    error: userError,
  } =
    await adminClient.auth.getUser(
      accessToken
    );

  if (
    userError ||
    !requestingUser
  ) {
    return NextResponse.json(
      {
        error:
          "Session si sahihi. Tafadhali login tena.",
      },
      {
        status: 401,
      }
    );
  }

  const {
    data: requestingProfile,
    error: profileError,
  } = await adminClient
    .from("profiles")
    .select(
      "id, role, is_active"
    )
    .eq(
      "id",
      requestingUser.id
    )
    .maybeSingle();

  if (
    profileError ||
    !requestingProfile
  ) {
    return NextResponse.json(
      {
        error:
          "Profile ya admin haikupatikana.",
      },
      {
        status: 403,
      }
    );
  }

  if (
    requestingProfile.role !==
      "admin" ||
    !requestingProfile.is_active
  ) {
    return NextResponse.json(
      {
        error:
          "Huna ruhusa ya kutengeneza user.",
      },
      {
        status: 403,
      }
    );
  }

  let body: CreateUserRequest;

  try {
    body =
      (await request.json()) as CreateUserRequest;
  } catch {
    return NextResponse.json(
      {
        error:
          "Request body si sahihi.",
      },
      {
        status: 400,
      }
    );
  }

  const fullName =
    body.full_name?.trim() ?? "";

  const email =
    body.email
      ?.trim()
      .toLowerCase() ?? "";
  const username=normalizeUsername(body.username??"");
  const phone=normalizeTanzanianPhone(body.phone??"");

  const password =
    body.password ?? "";

  const role =
    body.role;

  if (fullName.length < 2) {
    return NextResponse.json(
      {
        error:
          "Full name inahitajika.",
      },
      {
        status: 400,
      }
    );
  }

  if (email&&!email.includes("@")) {
    return NextResponse.json(
      {
        error:
          "Weka email sahihi.",
      },
      {
        status: 400,
      }
    );
  }

  if(body.action==="reset_password"){
    if(!body.user_id||!body.password||body.password.length<8)return NextResponse.json({error:"Temporary password lazima iwe characters 8 au zaidi."},{status:400});
    const {error:resetError}=await adminClient.auth.admin.updateUserById(body.user_id,{password:body.password});
    if(resetError)return NextResponse.json({error:"Password haikuweza kuwekwa upya."},{status:400});
    const {error:flagError}=await adminClient.from("profiles").update({force_password_change:true,updated_at:new Date().toISOString()}).eq("id",body.user_id);
    if(flagError)return NextResponse.json({error:"Password reset status haikuweza kuhifadhiwa."},{status:500});
    return NextResponse.json({message:"Temporary password imewekwa. User atalazimika kuibadilisha."});
  }
  if(body.phone&&!phone)return NextResponse.json({error:"Weka namba halali ya Tanzania (+255)."},{status:400});
  if(body.username&&!username)return NextResponse.json({error:"Username lazima iwe characters 4–30 na itumie herufi, namba, nukta, underscore au hyphen."},{status:400});
  if(!email&&!username)return NextResponse.json({error:"Username inahitajika wakati email haijawekwa."},{status:400});

  if (password.length < 8) {
    return NextResponse.json(
      {
        error:
          "Password lazima iwe na characters 8 au zaidi.",
      },
      {
        status: 400,
      }
    );
  }

  if (
    !role ||
    !allowedRoles.includes(role)
  ) {
    return NextResponse.json(
      {
        error:
          "Role inayoruhusiwa ni Organizer au Scanner.",
      },
      {
        status: 400,
      }
    );
  }

  const {
    data: createdUserData,
    error: createUserError,
  } =
    await adminClient.auth.admin.createUser(
      {
        email:email||`user-${randomUUID()}@internal.smarteventpass.co.tz`,
        email_confirm:true,
        password,

        user_metadata: {
          full_name: fullName,
          role,
        },
      }
    );

  if (
    createUserError ||
    !createdUserData.user
  ) {
    return NextResponse.json(
      {
        error:
          createUserError?.message ??
          "User hakuweza kutengenezwa.",
      },
      {
        status: 400,
      }
    );
  }

  const newUserId =
    createdUserData.user.id;
  const internalAuthEmail=createdUserData.user.email!;
  const {error:identityError}=await adminClient.from("user_login_identities").insert({user_id:newUserId,username:username||null,normalized_username:username||null,normalized_phone:phone?phone.slice(1):null,real_email:email||null,normalized_real_email:email||null,internal_auth_email:internalAuthEmail});
  if(identityError){await adminClient.auth.admin.deleteUser(newUserId);return NextResponse.json({error:identityError.code==="23505"?"Username, phone au email tayari inatumika.":"Login identity haikuweza kutengenezwa."},{status:400});}

  const {
    data: updatedProfile,
    error: updateProfileError,
  } = await adminClient
    .from("profiles")
    .update({
      full_name: fullName,
      role,
      is_active: true,
      authentication_type:email?"EMAIL":phone?"PHONE":"USERNAME",
      login_email:email||null,
      login_phone:phone||null,
      login_username:username||null,
      force_password_change:body.force_password_change!==false,
      updated_at:
        new Date().toISOString(),
    })
    .eq("id", newUserId)
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

  if (updateProfileError) {
    await adminClient
      .auth
      .admin
      .deleteUser(newUserId);

    return NextResponse.json(
      {
        error:
          "Profile haikuweza kutengenezwa. User creation imerudishwa nyuma.",
      },
      {
        status: 500,
      }
    );
  }

  return NextResponse.json(
    {
      message:
        "User ametengenezwa vizuri.",

      profile:
        updatedProfile,
    },
    {
      status: 201,
    }
  );
}
