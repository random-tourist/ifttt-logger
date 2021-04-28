import { serve } from "https://deno.land/x/sift/mod.ts";

const IFTTT_EVENT = Deno.env.get("IFTTT_EVENT");
const IFTTT_SECRET = Deno.env.get("IFTTT_SECRET");

enum LEVEL {
  DEB = "DEB",
  INF = "INF",
  WAR = "WAR",
  ERR = "ERR",
  UNK = "UNK",
}

serve({
  "/": (request: Request) => handle(request),
  404: (request: Request) => {
    log(
      undefined,
      LEVEL.WAR,
      "IFTTT logger",
      `Bad request: ${getRequestInfo(request)}`,
    );
    return getErrorResponse();
  },
});

const handle = async (request: Request) => {
  if (request.method !== "POST") {
    log(
      undefined,
      LEVEL.WAR,
      "IFTTT logger",
      `Method not allowed (${getRequestInfo(request)})`,
    );
    return getErrorResponse();
  }
  return request.json()
    .then(({ timestamp, level, source, message }) => {
      const nLevel = (level ?? "").toUpperCase();
      const l = Object.values(LEVEL).includes(nLevel)
        ? nLevel as LEVEL
        : LEVEL.UNK;
      log(
        parseInt(timestamp, 10),
        l,
        (source ?? "Unknown source").toString(),
        (message ?? "???").toString(),
      );
      return new Response(undefined, {
        status: 204,
        headers: getResponseHearders(),
      });
    })
    .catch((error) => {
      log(
        undefined,
        LEVEL.ERR,
        "IFTTT logger",
        (error.toString() || `Unkown error`) + ` (${getRequestInfo(request)})`,
      );
      return getErrorResponse();
    });
};

const log = async (
  timestamp: number | undefined,
  level: LEVEL,
  source: string,
  message: string,
) => {
  let date = new Date();
  if (timestamp) {
    date = new Date(timestamp);
  }
  let logmoji;
  switch (level) {
    case LEVEL.DEB:
      logmoji = "🔍";
      break;
    case LEVEL.INF:
      logmoji = "💡";
      break;
    case LEVEL.WAR:
      logmoji = "⚡";
      break;
    case LEVEL.ERR:
      logmoji = "🌋";
      break;
    default:
      logmoji = "❔";
      break;
  }
  const value1 = `⏳ ${toShortString(date)}`;
  const value2 = `${logmoji}  ${source}`;
  const value3 = message;
  return fetch(
    `https://maker.ifttt.com/trigger/${IFTTT_EVENT}/with/key/${IFTTT_SECRET}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        value1,
        value2,
        value3,
      }),
    },
  ).catch(console.error);
};

const getErrorResponse = () =>
  new Response(undefined, {
    status: 418,
    headers: getResponseHearders(),
  });

const toShortString = (date: Date): string =>
  new Intl.DateTimeFormat("fr", {
    dateStyle: "short",
    timeStyle: "medium",
    timeZone: "Europe/Paris",
  })
    .format(date)
    .split(" ")
    .map((d) =>
      /\d{2}\/\d{2}\/\d{4}/.test(d) ? d.split("/").reverse().join("/") : d
    )
    .join("-");

const getResponseHearders = (): Headers =>
  new Headers({
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST",
  });

const getRequestInfo = (request: Request): string =>
  `${request.method} ${request.url}`;
