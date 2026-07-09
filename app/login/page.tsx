import Button from "@/components/Button";
import Input from "@/components/Input";

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-slate-100 flex items-center justify-center">
      <div className="bg-white p-10 rounded-xl shadow-lg w-full max-w-md">
        <h1 className="text-3xl font-bold text-center text-blue-700">
          Smart Event Pass
        </h1>

        <p className="text-center text-gray-500 mt-2">
          Sign in to continue
        </p>

        <form className="mt-8 space-y-5">
          <Input
            label="Email"
            type="email"
            placeholder="Enter your email"
          />

          <Input
            label="Password"
            type="password"
            placeholder="********"
          />

          <div className="w-full">
            <Button text="Login" type="submit" />
          </div>
        </form>
      </div>
    </main>
  );
}