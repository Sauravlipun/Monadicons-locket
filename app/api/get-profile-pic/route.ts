import { NextRequest, NextResponse } from "next/server";
import * as cheerio from "cheerio";

export async function GET(req: NextRequest) {
  const handle = req.nextUrl.searchParams.get("handle")?.replace(/^@/, "");
  if (!handle) {
    return NextResponse.json({ error: "No handle provided" }, { status: 400 });
  }

  try {
    const response = await fetch(`https://x.com/${handle}`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      },
    });
    if (!response.ok) {
      return NextResponse.json({ error: "Failed to fetch X profile" }, { status: 404 });
    }
    const html = await response.text();
    const $ = cheerio.load(html);
    let src = $("img[src*='profile_images']").first().attr("src");
    if (src) {
      src = src.replace("_normal", "_400x400");
      return NextResponse.json({ url: src });
    } else {
      return NextResponse.json({ error: "Profile pic not found" }, { status: 404 });
    }
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
