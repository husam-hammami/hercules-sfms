import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

type ApiRequestOptions = RequestInit & { urlOverride?: string };

function mergeHeaders(target: Record<string, string>, source?: HeadersInit) {
  if (!source) return;
  if (source instanceof Headers) {
    source.forEach((value, key) => {
      target[key] = value;
    });
  } else if (Array.isArray(source)) {
    source.forEach(([key, value]) => {
      target[key] = value as string;
    });
  } else {
    Object.assign(target, source);
  }
}

export async function apiRequest(method: string, url: string, data?: unknown): Promise<Response>;
export async function apiRequest(url: string, options: RequestInit): Promise<Response>;
export async function apiRequest(
  arg1: string,
  arg2: string | RequestInit,
  arg3?: unknown,
): Promise<Response> {
  let method: string;
  let url: string;
  let body: BodyInit | undefined;
  let additionalOptions: ApiRequestOptions = {};
  const headers: Record<string, string> = {};

  if (typeof arg2 === "string") {
    method = arg1;
    url = arg2;
    if (arg3 !== undefined) {
      if (
        typeof arg3 === "string" ||
        arg3 instanceof Blob ||
        arg3 instanceof FormData ||
        arg3 instanceof URLSearchParams
      ) {
        body = arg3 as BodyInit;
      } else {
        body = JSON.stringify(arg3);
        headers["Content-Type"] = "application/json";
      }
    }
  } else {
    url = arg1;
    method = arg2.method ?? "GET";
    additionalOptions = { ...arg2 };
    if (additionalOptions.headers) {
      mergeHeaders(headers, additionalOptions.headers);
      delete additionalOptions.headers;
    }
    if (additionalOptions.body !== undefined) {
      body = additionalOptions.body as BodyInit;
      delete additionalOptions.body;
    }
  }

  const sessionId = localStorage.getItem("sessionId");
  if (sessionId) {
    headers["X-Session-Id"] = sessionId;
  }

  if (typeof body === "string" && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(url, {
    ...additionalOptions,
    method,
    headers,
    body,
    credentials: additionalOptions.credentials ?? "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    // Get session ID from localStorage if available
    const sessionId = localStorage.getItem('sessionId');
    const headers: any = {};
    
    // Add session ID to headers if available
    if (sessionId) {
      headers['X-Session-Id'] = sessionId;
    }
    
    const res = await fetch(queryKey[0] as string, {
      headers,
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
