import { CourseView } from "@/components/CourseView";

// Public: guests can view the Course page. Building a course hits the auth-gated
// API, so acting while logged out prompts a login (handled in CourseView).
export default function CoursePage() {
  return (
    <div className="space-y-8">
      <CourseView />
    </div>
  );
}
