import { NextResponse } from "next/server";
import { prepareText } from "@/shared/lib/text-prep";
import { prepareTextRequestSchema } from "@/shared/lib/prepare-text-schema";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = prepareTextRequestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request payload" },
      { status: 400 }
    );
  }

  try {
    const result = prepareText(parsed.data.text, parsed.data.options);
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to prepare text";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
