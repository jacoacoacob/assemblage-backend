import { createClient } from "redis";

import type { IOContext } from "./io/types";
import { resolveAndSend } from "./io/handlers/composed";

const redisClient = createClient({
    url: process.env.REDIS_URL,
    socket: {
        reconnectStrategy: 1000,
    }
}).on("error", (error) => {
    console.warn("[redisClient] error", error);
}).on("connect", () => {
    console.log("[redisClient] connect");
}).on("ready", () => {
    console.log("[redisClient] ready");
}).on("end", () => {
    console.log("[redisClient] end");
})

redisClient
    .connect()
    .catch((error) => {
        console.warn("[redisClient] connect error", new Date().toJSON(), error);
    });

redisClient.configSet("notify-keyspace-events", "Ex");

const subscriber = redisClient.duplicate();

subscriber.connect().catch(console.error);

function makeSessionExpiredHandler(context: IOContext) {
    subscriber.subscribe(
        "__keyevent@0__:expired",
        async (key) => {
            console.log("[__keyevent@0__:expired]", key);
            resolveAndSend(context, ["to_all", "session:all"]);
        }
    );
}

export { redisClient, makeSessionExpiredHandler };
