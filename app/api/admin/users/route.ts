import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type AllowedRole =
  | "organizer"
  | "scanner";

type CreateUserRequest = {
  full_name?: string;
  authentication_type?: "EMAIL" | "PHONE";
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
  const authenticationType=body.authentication_type??"EMAIL";
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

  if (authenticationType==="EMAIL"&&(!email||!email.includes("@"))) {
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
  if(authenticationType==="PHONE"&&!phone)return NextResponse.json({error:"Weka namba halali ya Tanzania (+255)."},{status:400});

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
        ...(authenticationType==="EMAIL"?{email,email_confirm:true}:{phone,phone_confirm:true}),
        password,

        user_metadata: {
          full_name: fullName,
          role,
          authentication_type:authenticationType,
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

  const {
    data: updatedProfile,
    error: updateProfileError,
  } = await adminClient
    .from("profiles")
    .update({
      full_name: fullName,
      role,
      is_active: true,
      authentication_type:authenticationType,
      login_email:authenticationType==="EMAIL"?email:null,
      login_phone:authenticationType==="PHONE"?phone:null,
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
      ,authentication_type,login_email,login_phone,force_password_change
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
