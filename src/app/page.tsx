import { WriterHome } from "@/components/WriterHome";

// Public: guests can view and try the Write surface. The correction API stays
// auth-gated, so acting while logged out prompts a login (handled in WriterPane).
export default function HomePage() {
  return <WriterHome />;
}
