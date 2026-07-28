import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";

const BLOOD_GROUPS = ["O+", "O-", "A+", "A-", "B+", "B-", "AB+", "AB-"] as const;

export default defineTool({
  name: "search_donors",
  title: "Search donors",
  description:
    "Search publicly listed blood donors by optional blood group, state, and/or city. Returns donor name, blood group, state, city, contact, and Aadhaar-verified flag.",
  inputSchema: {
    blood_group: z.enum(BLOOD_GROUPS).optional().describe("Blood group to match, e.g. 'O+'."),
    state: z.string().optional().describe("Indian state name."),
    city: z.string().optional().describe("City name (case-insensitive substring match)."),
    limit: z.number().int().min(1).max(100).optional().describe("Max results, default 25."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ blood_group, state, city, limit }, ctx) => {
    const url = process.env.SUPABASE_URL!;
    const key = process.env.SUPABASE_PUBLISHABLE_KEY!;
    // Use the caller's OAuth bearer so RLS applies as that user (they still
    // see all publicly listed donors via the public RLS policy).
    const supabase = createClient(url, key, {
      global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });

    let query = supabase
      .from("donors")
      .select("name, blood_group, state, city, contact, aadhaar_ok")
      .eq("is_listed", true)
      .eq("aadhaar_ok", true)
      .not("name", "is", null)
      .not("blood_group", "is", null)
      .not("state", "is", null)
      .not("city", "is", null)
      .not("contact", "is", null)
      .limit(limit ?? 25);

    if (blood_group) query = query.eq("blood_group", blood_group);
    if (state) query = query.eq("state", state);
    if (city) query = query.ilike("city", `%${city}%`);

    const { data, error } = await query;
    if (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? [], null, 2) }],
      structuredContent: { donors: data ?? [] },
    };
  },
});
