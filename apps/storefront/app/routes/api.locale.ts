import type { Route } from "./+types/api.locale";
import { redirect } from "react-router";
import { localeCookie } from "../i18n.server";

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const lng = url.searchParams.get("lng") || "en";
  const returnTo = url.searchParams.get("returnTo") || "/";

  const redirectUrl = new URL(returnTo, url.origin);
  redirectUrl.searchParams.set("locale", lng);

  return redirect(redirectUrl.pathname + redirectUrl.search, {
    headers: {
      "Set-Cookie": await localeCookie.serialize(lng),
    },
  });
}
