type LogDetails = Record<string, string | number | boolean | null | undefined>;

function runtimeSource() {
  return typeof window === "undefined" ? "server" : "browser";
}

function serializeError(error: unknown) {
  if (error instanceof Response) {
    return {
      type: "Response",
      status: error.status,
      statusText: error.statusText,
    };
  }

  if (error instanceof Error) {
    return {
      type: error.name,
      message: error.message,
    };
  }

  return {
    type: typeof error,
    message: String(error),
  };
}

function writeStorefrontLog(level: "log" | "warn" | "error", event: string, details: LogDetails = {}) {
  const payload = {
    event,
    source: runtimeSource(),
    timestamp: new Date().toISOString(),
    ...details,
  };

  console[level]("[storefront]", JSON.stringify(payload));
}

export function logStorefront(event: string, details?: LogDetails) {
  writeStorefrontLog("log", event, details);
}

export function logStorefrontError(event: string, error: unknown, details?: LogDetails) {
  const serializedError = serializeError(error);
  writeStorefrontLog("error", event, {
    ...details,
    errorType: serializedError.type,
    errorMessage: serializedError.message,
    errorStatus: "status" in serializedError ? serializedError.status : undefined,
  });
}

export async function withStorefrontLoaderLog<T>(
  loaderName: string,
  request: Request,
  load: () => Promise<T>,
  details: LogDetails = {},
): Promise<T> {
  const startedAt = Date.now();
  const url = new URL(request.url);

  logStorefront("loader.start", {
    loader: loaderName,
    path: url.pathname,
    search: url.search || null,
    ...details,
  });

  try {
    const result = await load();
    logStorefront("loader.success", {
      loader: loaderName,
      path: url.pathname,
      durationMs: Date.now() - startedAt,
      ...details,
    });
    return result;
  } catch (error) {
    if (error instanceof Response && error.status >= 300 && error.status < 400) {
      logStorefront("loader.redirect", {
        loader: loaderName,
        path: url.pathname,
        status: error.status,
        location: error.headers.get("Location"),
        durationMs: Date.now() - startedAt,
        ...details,
      });
    } else {
      logStorefrontError("loader.error", error, {
        loader: loaderName,
        path: url.pathname,
        durationMs: Date.now() - startedAt,
        ...details,
      });
    }
    throw error;
  }
}

export async function fetchBackendWithLog(
  label: string,
  input: RequestInfo | URL,
  init?: RequestInit,
) {
  const startedAt = Date.now();
  const url = typeof input === "string" ? input : input.toString();
  const method = init?.method ?? "GET";

  logStorefront("api.request", {
    label,
    method,
    url,
  });

  try {
    const response = await fetch(input, init);
    const details = {
      label,
      method,
      url,
      status: response.status,
      ok: response.ok,
      durationMs: Date.now() - startedAt,
    };

    if (response.ok) {
      logStorefront("api.response", details);
    } else {
      writeStorefrontLog("warn", "api.non_ok", details);
    }

    return response;
  } catch (error) {
    logStorefrontError("api.error", error, {
      label,
      method,
      url,
      durationMs: Date.now() - startedAt,
    });
    throw error;
  }
}
