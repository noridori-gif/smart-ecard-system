import { FormEvent } from "react";
import Input from "@/components/Input";
import Button from "@/components/Button";

export type GuestFormData = {
  full_name: string;
  phone: string;
  email: string;
  category: string;
  allowed_guests: string;
};

type GuestFormProps = {
  formData: GuestFormData;
  isSaving: boolean;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export default function GuestForm({
  formData,
  isSaving,
  onChange,
  onSubmit,
}: GuestFormProps) {
  return (
    <div className="rounded-xl bg-white p-8 shadow-md">
      <h2 className="text-2xl font-bold text-gray-800">
        Add New Guest
      </h2>

      <form
        onSubmit={onSubmit}
        className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2"
      >
        <Input
          label="Full Name"
          name="full_name"
          value={formData.full_name}
          placeholder="Guest full name"
          required
          onChange={onChange}
        />

        <Input
          label="Phone"
          name="phone"
          value={formData.phone}
          placeholder="+255..."
          onChange={onChange}
        />

        <Input
          label="Email"
          name="email"
          type="email"
          value={formData.email}
          placeholder="guest@example.com"
          onChange={onChange}
        />

        <Input
          label="Category"
          name="category"
          value={formData.category}
          placeholder="VIP, Family, Friend, Normal"
          required
          onChange={onChange}
        />

        <Input
          label="Allowed Guests"
          name="allowed_guests"
          type="number"
          value={formData.allowed_guests}
          required
          onChange={onChange}
        />

        <div className="flex items-end">
          <Button
            text={isSaving ? "Saving..." : "Add Guest"}
            type="submit"
            disabled={isSaving}
          />
        </div>
      </form>
    </div>
  );
}