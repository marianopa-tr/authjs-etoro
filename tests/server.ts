import { setupServer } from "msw/node";
import { http, HttpResponse } from "msw";
import { getTestJWKS } from "./helpers.js";

const jwksPromise = getTestJWKS();

export const server = setupServer(
  http.get("https://www.etoro.com/.well-known/jwks.json", async () => {
    const jwks = await jwksPromise;
    return HttpResponse.json(jwks);
  }),
);
