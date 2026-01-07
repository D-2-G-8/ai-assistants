import { notFound } from "next/navigation";
import SanitizeDev from "@/components/SanitizeDev";

export default function SanitizePage() {
  if (process.env.NODE_ENV !== "development") {
    notFound();
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f8f3ea] via-[#f0f9ff] to-[#f7f4ec] px-4">
      <SanitizeDev />
    </div>
  );
}
