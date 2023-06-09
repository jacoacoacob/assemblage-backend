
import { makeSessionExpiredHandler } from "../redis-client";
import { registerGameEventHandlers } from "./handlers/game-event-handlers";
import { createDisconnectHandler } from "./on-disconnect";
import { registerSessionEventHandlers } from "./handlers/session-event-handlers";
import type { IOContext, IOServer, IOServerSocket } from "./types";
import { registerResolvers, resolveAndSend } from "./handlers/composed";
import { registerGameMetaEventHandlers } from "./handlers/game-meta-handlers";
import { registerGameHistoryHandlers } from "./handlers/game-history-handlers";


function makeConnectionHandler(io: IOServer) {
    return async (socket: IOServerSocket) => {        
        const { data: { session } } = socket;
        
        if (!session) {
            throw new Error("unauthenticated");
        }

        const { gameId } = session;

        const context: IOContext = { io, socket, gameRoom: `game:${gameId}` };

        makeSessionExpiredHandler(context);

        socket.join(context.gameRoom);

        registerResolvers(context);

        resolveAndSend(
            context,
            ["to_sender", "game:meta"],
            ["to_sender", "game_history:events"],
            ["to_sender", "game_history:updated"],
            ["to_sender", "game:links"],
            ["to_sender", "game:players"],
            ["to_sender", "session:client_id"],
            ["to_all", "session:all"]
        )

        registerSessionEventHandlers(context);
        registerGameEventHandlers(context);
        registerGameMetaEventHandlers(context);
        registerGameHistoryHandlers(context);

        socket.on("disconnect", createDisconnectHandler(io, socket));
    }
}

export { makeConnectionHandler };
