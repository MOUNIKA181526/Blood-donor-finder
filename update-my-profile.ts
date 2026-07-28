import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";

const BLOOD_GROUPS = ["O+", "O-", "A+", "A-", "B+", "B-", "AB+", "AB-"] as const;

export default defineTool({
  name: "update_my_profile",
  title: "Update my donor profile",
  description:
    "Update the signed-in user's donor profile fields. Any omitted field is left unchanged. Aadhaar cannot be set through MCP.",
  inputSchema: {
    name: z.string().trim().min(1).max(120).optional(),
    blood_group: z.enum(BLOOD_GROUPS).optional(),
    state: z.string().trim().min(1).max(80).optional(),
    city: z.string().trim().min(1).max(80).optional(),
    contact: z.string().trim().min(3).max(40).optional().describe("Publicly displayed phone."),
    is_listed: z.boolean().optional().describe("Whether to appear in public search."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  handler: async (input, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const patch: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(input)) {
      if (v !== undefined) patch[k] = v;
    }
    if (Object.keys(patch).length === 0) {
      return { content: [{ type: "text", text: "No fields provided to update." }], isError: true };
    }

    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_PUBLISHABLE_KEY!,
      {
        global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
        auth: { persistSession: false, autoRefreshToken: false },
      },
    );
    const { data, error } = await supabase
      .from("donors")
      .update(patch)
      .eq("id", ctx.getUserId())
      .select("id, name, blood_group, state, city, contact, is_listed, aadhaar_ok")
      .maybeSingle();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      structuredContent: { profile: data },
    };
  },
});
