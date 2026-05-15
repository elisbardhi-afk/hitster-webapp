import { joinRoomAction } from "./actions";
import { MyRooms } from "@/components/MyRooms";

export const dynamic = "force-dynamic";

export default function JoinOnlineRoomPage({
  searchParams,
}: {
  searchParams: { error?: string; code?: string };
}) {
  return (
    <main className="min-h-screen flex flex-col items-center p-6 gap-6">
      <form
        action={joinRoomAction}
        className="w-full max-w-sm space-y-4 rounded-2xl border border-neutral-800 bg-neutral-900/50 p-6 mt-12"
      >
        <h1 className="text-xl font-semibold">Join a room</h1>
        <label className="block">
          <span className="text-sm text-neutral-300">Room code</span>
          <input
            name="code"
            required
            defaultValue={searchParams.code ?? ""}
            autoFocus
            maxLength={4}
            placeholder="ABCD"
            className="mt-1 w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 outline-none focus:border-neutral-400 uppercase tracking-widest text-lg"
          />
        </label>
        <label className="block">
          <span className="text-sm text-neutral-300">Your nickname</span>
          <input
            name="nickname"
            required
            maxLength={20}
            placeholder="e.g. Bardh"
            className="mt-1 w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 outline-none focus:border-neutral-400"
          />
        </label>
        <button
          type="submit"
          className="w-full rounded-lg bg-neutral-100 text-neutral-900 px-3 py-2 font-semibold hover:bg-white"
        >
          Join
        </button>
        {searchParams.error && (
          <p className="text-sm text-red-400">{decodeURIComponent(searchParams.error)}</p>
        )}
      </form>
      <MyRooms />
    </main>
  );
}
