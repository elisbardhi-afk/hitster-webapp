import Link from "next/link";
import { listActiveRooms } from "@/lib/games";
import { deleteRoomAction } from "./actions";

export const dynamic = "force-dynamic";

function formatRelative(iso: string): string {
  const date = new Date(iso);
  const diffMs = Date.now() - date.getTime();
  const mins = Math.round(diffMs / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

export default async function AdminRoomsPage() {
  const rooms = await listActiveRooms();

  return (
    <main className="p-6 max-w-5xl mx-auto">
      <div className="flex items-baseline justify-between mb-4 flex-wrap gap-2">
        <h1 className="text-2xl font-semibold">Active rooms</h1>
        <p className="text-sm text-neutral-400">
          {rooms.length} room{rooms.length === 1 ? "" : "s"} in lobby or playing
        </p>
      </div>

      {rooms.length === 0 ? (
        <p className="text-neutral-400 text-sm">
          No active rooms. Players create them from{" "}
          <Link href="/online/new" className="underline">/online/new</Link>.
        </p>
      ) : (
        <ul className="grid gap-3">
          {rooms.map((room) => {
            const winnerName =
              room.state.winner === "__defeat__"
                ? "defeat"
                : room.state.players.find((p) => p.id === room.state.winner)?.nickname;
            return (
              <li
                key={room.id}
                className="rounded-2xl border border-neutral-800 bg-neutral-900/50 p-4"
              >
                <div className="flex items-baseline justify-between gap-3 flex-wrap">
                  <div className="flex items-baseline gap-3">
                    <Link
                      href={`/online/${room.code}`}
                      className="text-2xl font-bold tracking-widest hover:text-fuchsia-300"
                    >
                      {room.code}
                    </Link>
                    <span
                      className={`text-xs uppercase tracking-widest px-2 py-0.5 rounded ${
                        room.status === "lobby"
                          ? "bg-neutral-800 text-neutral-300"
                          : "bg-fuchsia-900/40 text-fuchsia-200"
                      }`}
                    >
                      {room.status}
                    </span>
                    <span className="text-xs uppercase text-neutral-500">
                      {room.variant}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-neutral-500">
                      created {formatRelative(room.created_at)} · updated{" "}
                      {formatRelative(room.updated_at)}
                    </span>
                    <form action={deleteRoomAction}>
                      <input type="hidden" name="id" value={room.id} />
                      <button
                        type="submit"
                        className="text-xs text-red-300 hover:text-red-200"
                      >
                        Delete
                      </button>
                    </form>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {room.state.players.map((p, idx) => {
                    const isActive =
                      room.status === "playing" &&
                      idx === room.state.currentPlayerIdx;
                    return (
                      <span
                        key={p.id}
                        className={`rounded-full border px-3 py-1 text-xs flex items-center gap-1.5 ${
                          isActive
                            ? "border-fuchsia-400 text-fuchsia-200 bg-fuchsia-400/10"
                            : "border-neutral-700 text-neutral-300"
                        }`}
                      >
                        {idx === 0 && <span className="text-amber-300">★</span>}
                        {p.nickname}
                        {room.status === "playing" && (
                          <span className="text-neutral-500">
                            ({p.timeline.length}/10)
                          </span>
                        )}
                      </span>
                    );
                  })}
                  {room.state.players.length === 0 && (
                    <span className="text-xs text-neutral-500 italic">
                      no players yet
                    </span>
                  )}
                </div>

                {winnerName && (
                  <p className="mt-2 text-xs text-amber-300">
                    🏆 Winner: {winnerName}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
