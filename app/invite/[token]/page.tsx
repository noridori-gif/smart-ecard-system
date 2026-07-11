import { notFound } from "next/navigation";

type Props = {
  params: Promise<{
    token: string;
  }>;
};

export default async function InvitationPage({ params }: Props) {
  const { token } = await params;

  if (!token) {
    notFound();
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 p-6">
      <div className="w-full max-w-2xl rounded-2xl bg-white p-10 shadow-lg">
        <h1 className="text-center text-4xl font-bold text-blue-700">
          Smart Event Pass
        </h1>

        <p className="mt-6 text-center text-lg text-gray-600">
          Invitation Page
        </p>

        <div className="mt-8 rounded-lg bg-slate-100 p-4">
          <p className="font-semibold">Invitation Token</p>

          <p className="mt-2 break-all text-blue-700">
            {token}
          </p>
        </div>
      </div>
    </main>
  );
}