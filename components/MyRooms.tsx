import Link from "next/link";
import { cookies } from "next/headers";
import { getRoomsByCodes } from "@/lib/games";

const PLAYER_COOKIE_PREFIX = "hitster_player_";

export async function MyRooms() {
  const all = cookies().getAll();
  const myRoomCodes = all
    .filter((c) => c.name.startsWith(PLAYER_COOKIE_PREFIX))
    .map((c) => ({ code: c.name.slice(PLAYER_COOKIE_PREFIX.length), playerId: c.value }));

  if (myRoomCodes.length === 0) return null;

  const rooms = await getRoomsByCodes(myRoomCodes.map((r) => r.code));
  const byCode = new Map(rooms.map((r) => [r.code, r]));

  const cards = myRoomCodes
    .map(({ code, playerId }) => ({
      code,
      playerId,
      room: byCode.get(code),
    }))
    .filter((c) => c.room && c.room.status !== "finished");

  if (cards.length === 0) return null;

  return (
    <section className="w-full max-w-md space-y-2">
      <h2 className="text-xs uppercase tracking-[0.3em] text-neutral-400 text-center">
        Your active rooms
      </h2>
      <ul className="space-y-2">
        {cards.map(({ code, playerId, room }) => {
          if (!room) return null;
          const me = room.state.players.find((p) => p.id === playerId);
          if (!me) return null;
          const otherCount = room.state.players.length - 1;
          return (
            <li key={code}>
              <Link
                href={`/online/${code}`}
                className="flex items-center justify-between gap-3 rounded-2xl border border-neutral-800 bg-neutral-900/50 px-4 py-3 hover:bg-neutral-900 transition"
              >
                <div className="flex items-baseline gap-3">
                  <span className="text-lg font-bold tracking-widest">{code}</span>
                  <span className="text-xs text-neutral-400">
                    as <span className="text-fuchsia-300">{me.nickname}</span>
                  </span>
                </div>
                <div className="text-right">
                  <p className="text-xs text-neutral-400">
                    {room.status === "lobby" ? "In lobby" : "In progress"}
                  </p>
                  <p className="text-[10px] text-neutral-500">
                    {otherCount === 0
                      ? "just you"
                      : `+${otherCount} other${otherCount === 1 ? "" : "s"}`}
                  </p>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
