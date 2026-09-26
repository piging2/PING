/**
 * Minimal next/server stub for the Ask FYD route tests.
 *
 * The sandbox running the fyd/ask jest project does not install the `next`
 * package, so the real "next/server" types and runtime are unavailable. The
 * Ask route handlers only need two primitives from it: request.json() and
 * NextResponse.json(data, { status }). This stub provides just those, with
 * enough fidelity for the tests (status codes and parsed JSON bodies).
 *
 * Production is unaffected: this file is only wired into the test suite via
 * moduleNameMapper in src/fyd/ask/jest.config.cjs.
 */
export class NextRequest {
  readonly url: string;
  readonly method: string;
  readonly headers: Headers;
  private readonly rawBody: string | null;

  constructor(input: string | URL, init?: { method?: string; headers?: HeadersInit; body?: BodyInit | null }) {
    this.url = typeof input === "string" ? input : input.toString();
    this.method = init?.method ?? "GET";
    this.headers = new Headers(init?.headers);
    const body = init?.body ?? null;
    this.rawBody = typeof body === "string" ? body : body === null ? null : String(body);
  }

  async json(): Promise<unknown> {
    if (this.rawBody === null) throw new Error("no body");
    return JSON.parse(this.rawBody);
  }

  async text(): Promise<string> {
    return this.rawBody ?? "";
  }
}

export class NextResponse {
  readonly status: number;
  private readonly payload: unknown;

  private constructor(status: number, payload: unknown) {
    this.status = status;
    this.payload = payload;
  }

  static json(data: unknown, init?: { status?: number }): NextResponse {
    return new NextResponse(init?.status ?? 200, data);
  }

  // Typed as any to match Next.js: NextResponse.json() resolves to any.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async json(): Promise<any> {
    return this.payload;
  }
}
