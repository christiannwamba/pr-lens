const GITHUB_API = "https://api.github.com";
const GITHUB_GRAPHQL = `${GITHUB_API}/graphql`;

type GithubFetchOptions = {
  accept?: string;
};

type GithubGraphQLError = {
  message?: string;
};

type GithubGraphQLResponse<T> = {
  data?: T;
  errors?: GithubGraphQLError[];
};

function createGitHubHeaders(accept?: string) {
  const token = process.env.GITHUB_TOKEN;
  const headers: Record<string, string> = {
    Accept: accept ?? "application/vnd.github+json",
    "User-Agent": "pr-lens",
    "X-GitHub-Api-Version": "2022-11-28",
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
}

async function buildGitHubError(path: string, response: Response) {
  const bodyText = await response.text();

  if (response.status === 403 && response.headers.get("x-ratelimit-remaining") === "0") {
    return new Error("GitHub API rate limit exceeded. Set GITHUB_TOKEN for higher limits.");
  }

  return new Error(
    `GitHub API error: ${response.status} ${response.statusText} for ${path}${
      bodyText ? ` - ${bodyText}` : ""
    }`,
  );
}

export async function githubFetch(
  path: string,
  options?: GithubFetchOptions,
): Promise<Response> {
  const response = await fetch(`${GITHUB_API}${path}`, {
    cache: "no-store",
    headers: createGitHubHeaders(options?.accept),
  });

  if (!response.ok) {
    throw await buildGitHubError(path, response);
  }

  return response;
}

export async function githubGraphQL<T>(
  query: string,
  variables: Record<string, unknown>,
): Promise<GithubGraphQLResponse<T>> {
  const token = process.env.GITHUB_TOKEN;

  if (!token) {
    throw new Error("GITHUB_TOKEN required for GraphQL API requests.");
  }

  const response = await fetch(GITHUB_GRAPHQL, {
    body: JSON.stringify({ query, variables }),
    cache: "no-store",
    headers: {
      ...createGitHubHeaders("application/json"),
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  if (!response.ok) {
    throw await buildGitHubError("/graphql", response);
  }

  const payload = (await response.json()) as GithubGraphQLResponse<T>;

  if (payload.errors?.length) {
    const message = payload.errors
      .map((error) => error.message)
      .filter(Boolean)
      .join("; ");

    throw new Error(message || "GitHub GraphQL returned an unknown error.");
  }

  return payload;
}
