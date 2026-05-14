export interface Env {
  ASSETS: { fetch(request: Request): Promise<Response> }
}

const ADS_TXT = 'google.com, ca-pub-5965587089181234, DIRECT, f08c47fec0942fa0\n'

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const { pathname } = new URL(request.url)
    if (pathname === '/ads.txt') {
      return new Response(ADS_TXT, {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Cache-Control': 'public, max-age=86400',
        },
      })
    }
    return env.ASSETS.fetch(request)
  },
}
