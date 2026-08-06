import type { Metadata } from "next";
import { CourseView } from "@/components/CourseView";

export const metadata: Metadata = {
  title: "Your personalized English grammar course",
  description:
    "A personalized grammar course generated from your own mistakes — chapters and exercises built around the errors you actually make, so you stop repeating them.",
  alternates: { canonical: "/course" },
};

// Public: guests can view the Course page. Building a course hits the auth-gated
// API, so acting while logged out prompts a login (handled in CourseView).
export default function CoursePage() {
  return (
    <div className="space-y-8">
      <CourseView />
    </div>
  );
}
