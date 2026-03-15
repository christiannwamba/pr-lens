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

export class GitHubApiError extends Error {
  readonly bodyText: string;
  readonly path: string;
  readonly status: number;

  constructor({
    bodyText,
    message,
    path,
    status,
  }: {
    bodyText: string;
    message: string;
    path: string;
    status: number;
  }) {
    super(message);
    this.name = "GitHubApiError";
    this.bodyText = bodyText;
    this.path = path;
    this.status = status;
  }
}

function createGitHubHeaders(accept?: string, includeAuth = true) {
  const token = includeAuth ? process.env.GITHUB_TOKEN : undefined;
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

function shouldRetryWithoutAuth(response: Response, bodyText: string) {
  return response.status === 401 && /bad credentials/i.test(bodyText);
}

async function buildGitHubError(path: string, response: Response) {
  const bodyText = await response.text();

  if (response.status === 403 && response.headers.get("x-ratelimit-remaining") === "0") {
    return new GitHubApiError({
      bodyText,
      message: "GitHub API rate limit exceeded. Set GITHUB_TOKEN for higher limits.",
      path,
      status: response.status,
    });
  }

  return new GitHubApiError({
    bodyText,
    message: `GitHub API error: ${response.status} ${response.statusText} for ${path}${
      bodyText ? ` - ${bodyText}` : ""
    }`,
    path,
    status: response.status,
  });
}

export async function githubFetch(
  path: string,
  options?: GithubFetchOptions,
): Promise<Response> {
  const response = await fetch(`${GITHUB_API}${path}`, {
    cache: "no-store",
    headers: createGitHubHeaders(options?.accept),
  });

  if (process.env.GITHUB_TOKEN && response.status === 401) {
    const bodyText = await response.text();

    if (shouldRetryWithoutAuth(response, bodyText)) {
      const fallbackResponse = await fetch(`${GITHUB_API}${path}`, {
        cache: "no-store",
        headers: createGitHubHeaders(options?.accept, false),
      });

      if (!fallbackResponse.ok) {
        throw await buildGitHubError(path, fallbackResponse);
      }

      return fallbackResponse;
    }

    throw new GitHubApiError({
      bodyText,
      message: `GitHub API error: ${response.status} ${response.statusText} for ${path}${
        bodyText ? ` - ${bodyText}` : ""
      }`,
      path,
      status: response.status,
    });
  }

  if (!response.ok) {
    throw await buildGitHubError(path, response);
  }

  return response;
}

export async function githubGraphQL<T>(
  query: string,
  variables: Record<string, unknown>,
): Promise<T> {
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

  if (payload.data == null) {
    throw new Error("GitHub GraphQL returned no data.");
  }

  return payload.data;
}
