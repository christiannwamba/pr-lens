import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function parsePRUrl(
  url: string,
):
  | {
      owner: string;
      repo: string;
      prNumber: number;
    }
  | null {
  const trimmedUrl = url.trim();

  if (!trimmedUrl) {
    return null;
  }

  const normalizedUrl = trimmedUrl.startsWith("http")
    ? trimmedUrl
    : `https://${trimmedUrl}`;

  try {
    const parsedUrl = new URL(normalizedUrl);

    if (parsedUrl.hostname !== "github.com" && parsedUrl.hostname !== "www.github.com") {
      return null;
    }

    const [owner, repo, segment, prNumber] = parsedUrl.pathname
      .split("/")
      .filter(Boolean);

    if (!owner || !repo || segment !== "pull" || !prNumber) {
      return null;
    }

    const parsedPrNumber = Number.parseInt(prNumber, 10);

    if (!Number.isInteger(parsedPrNumber)) {
      return null;
    }

    return {
      owner,
      repo,
      prNumber: parsedPrNumber,
    };
  } catch {
    return null;
  }
}
