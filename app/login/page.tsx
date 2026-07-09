import Button from "@/components/Button";

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-slate-100 flex items-center justify-center">
      <div className="bg-white p-10 rounded-xl shadow-lg w-full max-w-md">
        <h1 className="text-3xl font-bold text-center text-blue-700">
          Smart E-Card
        </h1>

        <p className="text-center text-gray-500 mt-2">
          Sign in to continue
        </p>

        <form className="mt-8 space-y-5">
          <div>
            <label className="block mb-2 font-medium">
              Email
            </label>

            <input
              type="email"
              placeholder="Enter your email"
              className="w-full border rounded-lg p-3"
            />
          </div>

          <div>
            <label className="block mb-2 font-medium">
              Password
            </label>

            <input
              type="password"
              placeholder="********"
              className="w-full border rounded-lg p-3"
            />
          </div>

          <div className="w-full">
            <Button text="Login" type="submit" />
          </div>
        </form>
      </div>
    </main>
  );
}