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
  resetManagedUserPassword,
  deleteManagedUser,
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
  username:"",
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
  const [deleteTarget,setDeleteTarget]=useState<UserProfile|null>(null);

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
          username:createForm.username,
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
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-700">
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
          className="rounded-xl bg-emerald-700 px-5 py-3 text-sm font-bold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
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

      <div className="rounded-2xl border border-emerald-200 bg-white p-5 shadow-sm sm:p-6">
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
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 disabled:opacity-60"
            />
          </div>

          <div><label className="mb-2 block text-sm font-semibold text-slate-700">Username</label><input value={createForm.username} disabled={isCreating} placeholder="organizer-01" onChange={event=>setCreateForm(current=>({...current,username:event.target.value}))} className="w-full rounded-xl border border-slate-300 px-4 py-3"/></div>
          <div><label className="mb-2 block text-sm font-semibold text-slate-700">Mobile Number (optional)</label><input type="tel" value={createForm.phone} disabled={isCreating} placeholder="+255715631284" onChange={event=>setCreateForm(current=>({...current,phone:event.target.value}))} className="w-full rounded-xl border border-slate-300 px-4 py-3"/></div>
          <div><label className="mb-2 block text-sm font-semibold text-slate-700">Email Address (optional)</label><input type="email" value={createForm.email} disabled={isCreating} placeholder="user@example.com" onChange={event=>setCreateForm(current=>({...current,email:event.target.value}))} className="w-full rounded-xl border border-slate-300 px-4 py-3"/></div>
          <div className="rounded-xl bg-slate-50 p-3 text-sm"><b>Login methods</b><p className="mt-1 text-slate-600">{[createForm.username,createForm.phone,createForm.email].filter(Boolean).join(" · ")||"Add a username, phone or email."}</p></div>

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
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 disabled:opacity-60"
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
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 disabled:opacity-60"
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
              className="rounded-xl bg-emerald-700 px-6 py-3 text-sm font-bold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
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
              <div className="mx-auto h-11 w-11 animate-spin rounded-full border-4 border-slate-200 border-t-emerald-700" />

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
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 font-bold text-emerald-800">
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
                            {profile.login_username&&<p className="mt-1 text-xs font-semibold text-slate-600">👤 {profile.login_username}</p>}

                            {isCurrentUser && (
                              <p className="mt-0.5 text-xs font-semibold text-emerald-700">
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
                          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:bg-slate-100"
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
                        <button type="button" disabled={isCurrentUser||isUpdating} onClick={async()=>{const password=window.prompt("Enter a new temporary password (minimum 8 characters):");if(!password)return;try{setUpdatingUserId(profile.id);setSuccessMessage(await resetManagedUserPassword(profile.id,password));setProfiles(current=>current.map(item=>item.id===profile.id?{...item,force_password_change:true}:item));}catch(error){setErrorMessage(error instanceof Error?error.message:"Password reset failed.");}finally{setUpdatingUserId("");}}} className="mr-2 rounded-lg bg-amber-50 px-3 py-2 text-sm font-bold text-amber-800 disabled:opacity-50">Reset Password</button>
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
                        <button type="button" disabled={isCurrentUser||isUpdating} onClick={()=>setDeleteTarget(profile)} className="ml-2 rounded-lg bg-red-600 px-3 py-2 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-50">Delete Permanently</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {deleteTarget&&<PermanentDeleteDialog profile={deleteTarget} busy={updatingUserId===deleteTarget.id} onClose={()=>setDeleteTarget(null)} onDelete={async(confirmation,password)=>{try{setUpdatingUserId(deleteTarget.id);setErrorMessage("");await deleteManagedUser(deleteTarget.id,confirmation,password);setProfiles(current=>current.filter(item=>item.id!==deleteTarget.id));setDeleteTarget(null);setSuccessMessage("User deleted successfully.");}catch(error){const code=error instanceof Error?error.message:"delete-failed";setErrorMessage(code==="user-owns-protected-records"?"User owns protected records.":code==="cannot-delete-last-administrator"?"Cannot delete the last administrator.":code==="administrator-reauthentication-failed"?"Administrator password is incorrect.":"User could not be deleted.");}finally{setUpdatingUserId("");}}}/>}

    </section>
  );
}

function PermanentDeleteDialog({profile,busy,onClose,onDelete}:{profile:UserProfile;busy:boolean;onClose:()=>void;onDelete:(confirmation:string,password:string)=>Promise<void>}){const identifier=profile.login_username||profile.login_email?.split("@")[0]||profile.id;const phrase=`DELETE ${identifier}`;const [confirmation,setConfirmation]=useState("");const [password,setPassword]=useState("");useEffect(()=>{const handler=(event:KeyboardEvent)=>{if(event.key==="Escape"&&!busy)onClose();};window.addEventListener("keydown",handler);return()=>window.removeEventListener("keydown",handler);},[busy,onClose]);return <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/55 sm:items-center sm:p-6" role="presentation" onMouseDown={event=>event.target===event.currentTarget&&!busy&&onClose()}><section role="dialog" aria-modal="true" aria-labelledby="delete-user-title" aria-describedby="delete-user-description" className="max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl sm:max-w-xl sm:rounded-2xl sm:p-6"><h2 id="delete-user-title" className="text-xl font-black text-red-700">Confirm permanent deletion</h2><p id="delete-user-description" className="mt-2 text-sm text-slate-600">Disabling is recommended if this account has historical activity. Permanent deletion cannot be undone.</p><dl className="mt-4 grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-4 text-sm"><div><dt className="text-slate-500">Full name</dt><dd className="font-bold">{profile.full_name||"—"}</dd></div><div><dt className="text-slate-500">Username</dt><dd className="font-bold">{profile.login_username||"—"}</dd></div><div><dt className="text-slate-500">Phone</dt><dd className="font-bold">{profile.login_phone||"—"}</dd></div><div><dt className="text-slate-500">Real email</dt><dd className="font-bold">{profile.login_email||"—"}</dd></div><div><dt className="text-slate-500">Role</dt><dd className="font-bold">{getRoleLabel(profile.role)}</dd></div><div><dt className="text-slate-500">Status</dt><dd className="font-bold">{profile.is_active?"Active":"Disabled"}</dd></div></dl><label className="mt-4 block text-sm font-bold">Type confirmation phrase <span className="font-mono text-red-700">{phrase}</span><input autoFocus value={confirmation} onChange={event=>setConfirmation(event.target.value)} className="mt-1.5 w-full rounded-xl border px-3 py-3"/></label><label className="mt-4 block text-sm font-bold">Re-enter administrator password<input type="password" value={password} onChange={event=>setPassword(event.target.value)} className="mt-1.5 w-full rounded-xl border px-3 py-3"/></label><div className="mt-5 flex justify-end gap-2"><button type="button" disabled={busy} onClick={onClose} className="rounded-xl border px-4 py-3 font-bold">Cancel</button><button type="button" disabled={busy||confirmation!==phrase||!password} onClick={()=>void onDelete(confirmation,password)} className="rounded-xl bg-red-700 px-4 py-3 font-bold text-white disabled:opacity-40">{busy?"Deleting…":"Delete Permanently"}</button></div></section></div>}
