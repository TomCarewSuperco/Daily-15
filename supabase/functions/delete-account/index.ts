// Deletes the signed-in user's account. The user_state row is removed by the
// foreign key cascade. Requires a valid user JWT; uses the service role key,
// which Supabase provides to Edge Functions automatically.
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: cors });

  const token = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return Response.json({ error: "Not signed in" }, { status: 401, headers: cors });

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) return Response.json({ error: "Not signed in" }, { status: 401, headers: cors });

  const { error: delError } = await admin.auth.admin.deleteUser(data.user.id);
  if (delError) return Response.json({ error: "Couldn't delete account" }, { status: 500, headers: cors });

  return Response.json({ deleted: true }, { headers: cors });
});
