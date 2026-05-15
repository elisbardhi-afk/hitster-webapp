import { redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/auth";
import Link from "next/link";

export default async function ProtectedAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const authed = await isAdminAuthenticated();
  if (!authed) redirect("/admin/login");

  return (
    <div className="min-h-screen flex flex-col">
      <nav className="border-b border-neutral-800 bg-neutral-900/50 backdrop-blur px-6 py-3 flex items-center justify-between flex-wrap gap-3">
        <Link href="/admin" className="font-semibold">
          HITSTER Admin
        </Link>
        <div className="flex items-center gap-4 text-sm text-neutral-400">
          <Link href="/admin" className="hover:text-neutral-100">Catalog</Link>
          <Link href="/admin/songs/new" className="hover:text-neutral-100">Add song</Link>
          <Link href="/admin/songs/bulk" className="hover:text-neutral-100">Bulk import</Link>
          <Link href="/admin/qr-sheet" className="hover:text-neutral-100">QR sheet</Link>
          <Link href="/admin/rooms" className="hover:text-neutral-100">Rooms</Link>
          <form action="/api/admin/logout" method="post">
            <button className="hover:text-neutral-100">Log out</button>
          </form>
        </div>
      </nav>
      <div className="flex-1">{children}</div>
    </div>
  );
}
