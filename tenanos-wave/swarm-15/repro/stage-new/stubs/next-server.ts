/** Minimal next/server stub for route-handler unit tests (plain Node). */
export class NextRequest extends Request {
  constructor(input: string | URL | Request, init?: RequestInit) {
    super(input, init);
  }
}

export class NextResponse extends Response {
  static json(body: unknown, init?: ResponseInit): NextResponse {
    const headers = new Headers(init?.headers);
    headers.set("content-type", "application/json");
    return new NextResponse(JSON.stringify(body), { ...init, headers });
  }
}
