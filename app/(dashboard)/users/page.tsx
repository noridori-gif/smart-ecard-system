"use client";

import {
  type FormEvent,
  useCallback,
  useEffect,
  useState,
} from "react";

import { useRouter } from "next/navigation";

import {
  createManagedUser,
  getAllUserProfiles,
  getCurrentUserProfile,
  getRoleLabel,
  updateUserActiveStatus,
  updateUserRole,
  type UserProfile,
  type UserRole,
} from "@/services/profileService";

const availableRoles: UserRole[] = [
  "admin",
  "organizer",
  "scanner",
];

const initialCreateForm = {
  full_name: "",
  authentication_type:"EMAIL" as "EMAIL"|"PHONE",
  email: "",
  phone:"",
  password: "",
  role: "organizer" as "organizer" | "scanner",
  force_password_change:true,
};

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function getInitial(
  fullName: string | null
) {
  return (
    fullName
      ?.trim()
      .charAt(0)
      .toUpperCase() || "U"
  );
}

export default function UsersPage() {
  const router = useRouter();

  const [profiles, setProfiles] = useState<
    UserProfile[]
  >([]);

  const [
    currentUserId,
    setCurrentUserId,
  ] = useState("");

  const [isLoading, setIsLoading] =
    useState(true);

  const [createForm, setCreateForm] =
    useState(initialCreateForm);

  const [isCreating, setIsCreating] =
    useState(false);

  const [
    updatingUserId,
    setUpdatingUserId,
  ] = useState("");

  const [errorMessage, setErrorMessage] =
    useState("");

  const [successMessage, setSuccessMessage] =
    useState("");

  const loadUsers = useCallback(async () => {
    try {
      setIsLoading(true);
      setErrorMessage("");

      const currentProfile =
        await getCurrentUserProfile();

      if (!currentProfile) {
        router.replace("/login");
        router.refresh();

        return;
      }

      if (
        !currentProfile.is_active ||
        currentProfile.role !== "admin"
      ) {
        router.replace("/dashboard");
        router.refresh();

        return;
      }

      setCurrentUserId(currentProfile.id);

      const userProfiles =
        await getAllUserProfiles();

      setProfiles(userProfiles);
    } catch (error) {
      console.error(
        "Users loading error:",
        error
      );

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Users hawakuweza kupakiwa."
      );
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  useEffect(() => {
    const timer=window.setTimeout(()=>void loadUsers(),0);
    return ()=>window.clearTimeout(timer);
  }, [loadUsers]);

  async function handleCreateUser(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    try {
      setIsCreating(true);
      setErrorMessage("");
      setSuccessMessage("");

      const createdProfile =
        await createManagedUser({
          full_name: createForm.full_name,
          authentication_type:createForm.authentication_type,
          email:createForm.email,
          phone:createForm.phone,
          password: createForm.password,
          role: createForm.role,
          force_password_change:createForm.force_password_change,
        });

      setProfiles((currentProfiles) => [
        createdProfile,
        ...currentProfiles.filter(
          (profile) => profile.id !== createdProfile.id
        ),
      ]);

      setCreateForm(initialCreateForm);
      setSuccessMessage(
        `${getRoleLabel(createdProfile.role)} ametengenezwa vizuri.`
      );
    } catch (error) {
      console.error("User creation error:", error);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "User hakuweza kutengenezwa."
      );
    } finally {
      setIsCreating(false);
    }
  }

  async function handleRoleChange(
    userId: string,
    role: UserRole
  ) {
    if (userId === currentUserId) {
      setErrorMessage(
        "Huwezi kubadilisha role ya account yako mwenyewe."
      );

      return;
    }

    try {
      setUpdatingUserId(userId);
      setErrorMessage("");
      setSuccessMessage("");

      const updatedProfile =
        await updateUserRole(
          userId,
          role
        );

      setProfiles((currentProfiles) =>
        currentProfiles.map((profile) =>
          profile.id === userId
            ? updatedProfile
            : profile
        )
      );

      setSuccessMessage(
        `Role imebadilishwa kuwa ${getRoleLabel(
          role
        )}.`
      );
    } catch (error) {
      console.error(
        "Role update error:",
        error
      );

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Role haikuweza kubadilishwa."
      );
    } finally {
      setUpdatingUserId("");
    }
  }

  async function handleActiveStatusChange(
    profile: UserProfile
  ) {
    if (profile.id === currentUserId) {
      setErrorMessage(
        "Huwezi kuzima account yako mwenyewe."
      );

      return;
    }

    try {
      setUpdatingUserId(profile.id);
      setErrorMessage("");
      setSuccessMessage("");

      const updatedProfile =
        await updateUserActiveStatus(
          profile.id,
          !profile.is_active
        );

      setProfiles((currentProfiles) =>
        currentProfiles.map(
          (currentProfile) =>
            currentProfile.id ===
            profile.id
              ? updatedProfile
              : currentProfile
        )
      );

      setSuccessMessage(
        updatedProfile.is_active
          ? "Account imewashwa."
          : "Account imezimwa."
      );
    } catch (error) {
      console.error(
        "Status update error:",
        error
      );

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Account status haikuweza kubadilishwa."
      );
    } finally {
      setUpdatingUserId("");
    }
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-600">
            Administration
          </p>

          <h1 className="mt-2 text-3xl font-bold text-slate-900">
            User Management
          </h1>

          <p className="mt-2 text-sm text-slate-600">
            Simamia roles na account status za
            watumiaji wa Smart Event Pass.
          </p>
        </div>

        <button
          type="button"
          onClick={loadUsers}
          disabled={isLoading}
          className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isLoading
            ? "Refreshing..."
            : "Refresh Users"}
        </button>
      </div>

      {errorMessage && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700"
        >
          {errorMessage}
        </div>
      )}

      {successMessage && (
        <div
          role="status"
          className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700"
        >
          {successMessage}
        </div>
      )}

      <div className="rounded-2xl border border-blue-200 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="text-xl font-bold text-slate-900">
          Create New User
        </h2>

        <p className="mt-1 text-sm text-slate-600">
          Tengeneza Event Organizer au Event Scanner mpya.
        </p>

        <form
          onSubmit={handleCreateUser}
          className="mt-6 grid gap-5 md:grid-cols-2"
        >
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              Full Name
            </label>
            <input
              type="text"
              value={createForm.full_name}
              required
              disabled={isCreating}
              placeholder="User full name"
              onChange={(event) =>
                setCreateForm((current) => ({
                  ...current,
                  full_name: event.target.value,
                }))
              }
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:opacity-60"
            />
          </div>

          <fieldset><legend className="mb-2 text-sm font-semibold text-slate-700">Login Method</legend><div className="flex gap-4 rounded-xl border p-3"><label className="flex items-center gap-2"><input type="radio" checked={createForm.authentication_type==="EMAIL"} onChange={()=>setCreateForm(current=>({...current,authentication_type:"EMAIL"}))}/>Email Address</label><label className="flex items-center gap-2"><input type="radio" checked={createForm.authentication_type==="PHONE"} onChange={()=>setCreateForm(current=>({...current,authentication_type:"PHONE"}))}/>Mobile Phone Number</label></div></fieldset>

          <div><label className="mb-2 block text-sm font-semibold text-slate-700">{createForm.authentication_type==="EMAIL"?"Email Address":"Mobile Number (+255 format)"}</label><input type={createForm.authentication_type==="EMAIL"?"email":"tel"} value={createForm.authentication_type==="EMAIL"?createForm.email:createForm.phone} required disabled={isCreating} autoComplete="off" placeholder={createForm.authentication_type==="EMAIL"?"user@example.com":"+255758003927"} onChange={(event)=>setCreateForm(current=>({...current,[current.authentication_type==="EMAIL"?"email":"phone"]:event.target.value}))} className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:opacity-60"/></div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              Temporary Password
            </label>
            <input
              type="password"
              value={createForm.password}
              required
              minLength={8}
              disabled={isCreating}
              autoComplete="new-password"
              placeholder="At least 8 characters"
              onChange={(event) =>
                setCreateForm((current) => ({
                  ...current,
                  password: event.target.value,
                }))
              }
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:opacity-60"
            />
            <p className="mt-2 text-xs text-slate-500">
              Password iwe na characters 8 au zaidi.
            </p>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              User Role
            </label>
            <select
              value={createForm.role}
              disabled={isCreating}
              onChange={(event) =>
                setCreateForm((current) => ({
                  ...current,
                  role: event.target.value as
                    | "organizer"
                    | "scanner",
                }))
              }
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:opacity-60"
            >
              <option value="organizer">
                Event Organizer
              </option>
              <option value="scanner">
                Event Scanner
              </option>
            </select>
          </div>

          <label className="flex items-center gap-3 md:col-span-2"><input type="checkbox" checked={createForm.force_password_change} onChange={event=>setCreateForm(current=>({...current,force_password_change:event.target.checked}))}/><span className="text-sm font-semibold text-slate-700">Force password change on first login</span></label>

          <div className="md:col-span-2">
            <button
              type="submit"
              disabled={isCreating}
              className="rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isCreating
                ? "Creating User..."
                : "Create User"}
            </button>
          </div>
        </form>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">
            Total Users
          </p>

          <p className="mt-2 text-3xl font-bold text-slate-900">
            {profiles.length}
          </p>
        </div>

        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
          <p className="text-sm text-emerald-700">
            Active Users
          </p>

          <p className="mt-2 text-3xl font-bold text-emerald-700">
            {
              profiles.filter(
                (profile) =>
                  profile.is_active
              ).length
            }
          </p>
        </div>

        <div className="rounded-2xl border border-red-200 bg-red-50 p-5 shadow-sm">
          <p className="text-sm text-red-700">
            Inactive Users
          </p>

          <p className="mt-2 text-3xl font-bold text-red-700">
            {
              profiles.filter(
                (profile) =>
                  !profile.is_active
              ).length
            }
          </p>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {isLoading ? (
          <div className="flex min-h-72 items-center justify-center">
            <div className="text-center">
              <div className="mx-auto h-11 w-11 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />

              <p className="mt-4 text-sm font-medium text-slate-600">
                Inapakia users...
              </p>
            </div>
          </div>
        ) : profiles.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <p className="font-semibold text-slate-700">
              Hakuna users waliopatikana.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                    User
                  </th>

                  <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                    Role
                  </th>

                  <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                    Status
                  </th>

                  <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                    Created
                  </th>

                  <th className="px-5 py-4 text-right text-xs font-bold uppercase tracking-wide text-slate-500">
                    Action
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {profiles.map((profile) => {
                  const isCurrentUser =
                    profile.id ===
                    currentUserId;

                  const isUpdating =
                    updatingUserId ===
                    profile.id;

                  return (
                    <tr
                      key={profile.id}
                      className="transition hover:bg-slate-50"
                    >
                      <td className="whitespace-nowrap px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 font-bold text-blue-700">
                            {getInitial(
                              profile.full_name
                            )}
                          </div>

                          <div>
                            <p className="font-semibold text-slate-900">
                              {profile.full_name ||
                                "Unnamed User"}
                            </p>

                            <p className="mt-1 text-xs text-slate-500">{profile.authentication_type==="PHONE"?"📱 Phone":"📧 Email"} · {profile.login_phone?profile.login_phone.replace(/^(\+255)(\d{3})(\d{3})(\d{3})$/,"$1 $2 $3 $4"):profile.login_email||"—"}</p>

                            {isCurrentUser && (
                              <p className="mt-0.5 text-xs font-semibold text-blue-600">
                                Your account
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="whitespace-nowrap px-5 py-4">
                        <select
                          value={profile.role}
                          disabled={
                            isCurrentUser ||
                            isUpdating
                          }
                          onChange={(event) =>
                            handleRoleChange(
                              profile.id,
                              event.target
                                .value as UserRole
                            )
                          }
                          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100"
                        >
                          {availableRoles.map(
                            (role) => (
                              <option
                                key={role}
                                value={role}
                              >
                                {getRoleLabel(
                                  role
                                )}
                              </option>
                            )
                          )}
                        </select>
                      </td>

                      <td className="whitespace-nowrap px-5 py-4">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${
                            profile.is_active
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {profile.is_active
                            ? "Active"
                            : "Inactive"}
                        </span>
                      </td>

                      <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-500">
                        {formatDate(
                          profile.created_at
                        )}
                      </td>

                      <td className="whitespace-nowrap px-5 py-4 text-right">
                        <button
                          type="button"
                          disabled={
                            isCurrentUser ||
                            isUpdating
                          }
                          onClick={() =>
                            handleActiveStatusChange(
                              profile
                            )
                          }
                          className={`rounded-lg px-4 py-2 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-50 ${
                            profile.is_active
                              ? "bg-red-50 text-red-700 hover:bg-red-100"
                              : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                          }`}
                        >
                          {isUpdating
                            ? "Updating..."
                            : profile.is_active
                              ? "Deactivate"
                              : "Activate"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </section>
  );
}
