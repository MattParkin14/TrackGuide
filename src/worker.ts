interface Env {
  ASSETS: Fetcher;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    url.pathname = url.pathname.replace(/^\/trackguide/, '') || '/';
    return env.ASSETS.fetch(new Request(url.toString(), request));
  },
} satisfies ExportedHandler<Env>;
