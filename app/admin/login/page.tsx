import { login } from "./actions";

export default function AdminLoginPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <form
        action={login}
        className="w-full max-w-sm space-y-4 rounded-2xl border border-neutral-800 bg-neutral-900/50 p-6"
      >
        <h1 className="text-xl font-semibold">Admin login</h1>
        <input
          name="password"
          type="password"
          required
          autoFocus
          placeholder="Admin password"
          className="w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 outline-none focus:border-neutral-400"
        />
        {searchParams.error && (
          <p className="text-sm text-red-400">Incorrect password.</p>
        )}
        <button
          type="submit"
          className="w-full rounded-lg bg-neutral-100 text-neutral-900 px-3 py-2 font-semibold hover:bg-white"
        >
          Log in
        </button>
      </form>
    </main>
  );
}
