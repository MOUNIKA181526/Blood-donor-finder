import { auth, defineMcp } from "@lovable.dev/mcp-js";
import searchDonors from "./tools/search-donors";
import getMyProfile from "./tools/get-my-profile";
import updateMyProfile from "./tools/update-my-profile";

// The OAuth issuer must be the direct Supabase host, not the .lovable.cloud
// proxy that SUPABASE_URL rewrites to on publish. Vite inlines the project ref
// literal at build time.
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "blood-donor-finder",
  title: "Blood Donor Finder",
  version: "0.1.0",
  instructions:
    "Tools for the Blood Donor Finder app. Use `search_donors` to find publicly listed donors by blood group, state, or city. Use `get_my_profile` / `update_my_profile` to view or edit the signed-in donor's own listing.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [searchDonors, getMyProfile, updateMyProfile],
});
