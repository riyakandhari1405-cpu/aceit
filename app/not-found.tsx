import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <p className="text-sm text-copper">404</p>
      <h1 className="mt-2 text-3xl font-semibold">That page is not here</h1>
      <Link href="/" className="mt-4 text-sm text-copper">Back to AceIt</Link>
    </div>
  );
}
