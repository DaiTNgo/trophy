import { data } from "react-router";

export async function loader() {
  return data(null, { status: 404 });
}

export default function CatchAll() {
  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <h1 className="text-4xl font-bold">404 - Page Not Found</h1>
    </div>
  );
}
