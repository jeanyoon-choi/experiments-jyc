import { redirect } from "next/navigation";

// The page itself is one self-contained file served as it is
// (public/screen/simulation/reference/agent-models.html). This entry exists so
// the registry, and with it the navigation, lists it. Notes: ../../docs/models.md
export default function AgentModels(): never {
  redirect("/screen/simulation/reference/agent-models.html");
}
