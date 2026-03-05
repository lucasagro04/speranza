import { redirect } from "next/navigation";

/**
 * Twitch OAuth callback handler.
 * Redirects back to the app (Events tab) instead of a 404 blank page.
 */
export default function TwitchCallbackPage() {
  redirect("/?tab=events");
}
