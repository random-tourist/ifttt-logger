import { serve, validateRequest } from "https://deno.land/x/sift/mod.ts";

const IFTTT_EVENT = Deno.env.get("IFTTT_EVENT");
const IFTTT_SECRET = Deno.env.get("IFTTT_SECRET");

enum LEVEL {
  DEBUG,
  INFO,
  WARN,
  ERROR,
  UNKNOWN,
}

serve({
  "/": (request: Request) => handle(request),
  404: (request: Request) => {
    log(undefined, LEVEL.WARN, "IFTTT logger", `Bad request: ${request.url}`);
    return getErrorResponse();
  },
});

const handle = async (request: Request) =>
  validateRequest(request, {
    POST: {},
  })
    .then((error) => {
      if (error) {
        log(
          undefined,
          LEVEL.WARN,
          "IFTTT logger",
          (error.error?.message ?? "Validation failure"),
        );
        return getErrorResponse();
      }
      return request.json();
    })
    .then(({ timestamp, level, source, message }) => {
      const nLevel = level.toUpperCase();
      const l = Object.keys(LEVEL).includes(nLevel)
        ? nLevel as LEVEL
        : LEVEL.UNKNOWN;
      log(parseInt(timestamp, 10), l, source.toString(), message.toString());
      return new Response(undefined, {
        status: 204,
        headers: getResponseHearders(),
      });
    })
    .catch((error) => {
      log(
        undefined,
        LEVEL.ERROR,
        "IFTTT logger",
        JSON.stringify(error) || `Unkown error (${request.url})`,
      );
      return getErrorResponse();
    });

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
    case LEVEL.DEBUG:
      logmoji = "🔍";
      break;
    case LEVEL.INFO:
      logmoji = "💡";
      break;
    case LEVEL.WARN:
      logmoji = "⚡";
      break;
    case LEVEL.ERROR:
      logmoji = "🌋";
      break;
    default:
      logmoji = "❔";
      break;
  }
  const value1 = `⏳ ${toShortString(date)}`;
  const value2 = `${logmoji}  ${source}`;
  const value3 = message;
  return fetch(`https://maker.ifttt.com/trigger/${IFTTT_EVENT}/with/key/${IFTTT_SECRET}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      value1,
      value2,
      value3,
    }),
  });
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
