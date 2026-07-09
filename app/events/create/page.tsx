import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import Input from "@/components/Input";
import Button from "@/components/Button";

export default function CreateEventPage() {
  return (
    <div className="flex min-h-screen bg-gray-100">
      <Sidebar />

      <main className="flex-1 p-8">
        <Header />

        <div className="bg-white rounded-xl shadow-md p-8 mt-8">
          <h2 className="text-3xl font-bold text-gray-800">
            Create New Event
          </h2>

          <p className="text-gray-500 mt-2">
            Fill in the event details below.
          </p>

          <form className="grid grid-cols-2 gap-6 mt-8">
            <Input label="Event Title" placeholder="John & Mary Wedding" />
            <Input label="Event Type" placeholder="Wedding, Conference, Graduation" />
            <Input label="Bride Name" placeholder="Bride name" />
            <Input label="Groom Name" placeholder="Groom name" />
            <Input label="Event Date" type="date" />
            <Input label="Event Time" type="time" />
            <Input label="Venue" placeholder="Mlimani City Hall" />
            <Input label="Google Map Link" placeholder="https://maps.google.com/..." />

            <div className="col-span-2 mt-4">
              <Button text="Save Event" type="submit" />
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}