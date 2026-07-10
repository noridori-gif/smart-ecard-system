"use client";

import { FormEvent, useState } from "react";
import Button from "@/components/Button";
import Input from "@/components/Input";

export default function LoginPage() {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = event.target;

    setFormData((currentData) => ({
      ...currentData,
      [name]: value,
    }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    // Login halisi tutaunganisha baadaye.
    console.log(formData);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100">
      <div className="w-full max-w-md rounded-xl bg-white p-10 shadow-lg">
        <h1 className="text-center text-3xl font-bold text-blue-700">
          Smart Event Pass
        </h1>

        <p className="mt-2 text-center text-gray-500">
          Sign in to continue
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          <Input
            label="Email"
            name="email"
            type="email"
            value={formData.email}
            placeholder="Enter your email"
            required
            onChange={handleChange}
          />

          <Input
            label="Password"
            name="password"
            type="password"
            value={formData.password}
            placeholder="********"
            required
            onChange={handleChange}
          />

          <Button text="Login" type="submit" />
        </form>
      </div>
    </main>
  );
}