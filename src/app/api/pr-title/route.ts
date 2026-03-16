import { githubFetch } from "@/lib/github";
import { NextResponse, type NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const owner = searchParams.get("owner");
  const repo = searchParams.get("repo");
  const prNumber = searchParams.get("prNumber");

  if (!owner || !repo || !prNumber) {
    return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
  }

  try {
    const response = await githubFetch(`/repos/${owner}/${repo}/pulls/${prNumber}`);
    const data = (await response.json()) as { title: string };

    return NextResponse.json({ title: data.title });
  } catch {
    return NextResponse.json({ error: "Failed to fetch PR" }, { status: 500 });
  }
}
