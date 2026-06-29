import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname
  const publicPaths = ['/', '/login', '/register']
  const isPublic = publicPaths.some(p => path === p)

  // Verifica cookie de sessão do Supabase sem usar o cliente completo
  // (evita conflito com Edge Runtime)
  const projectRef = 'ldgvscnyiltteoevpqag'
  const hasSession =
    request.cookies.has(`sb-${projectRef}-auth-token`) ||
    request.cookies.has(`sb-${projectRef}-auth-token.0`) ||
    request.cookies.has(`sb-${projectRef}-auth-token.1`)

  if (!hasSession && !isPublic) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (hasSession && (path === '/login' || path === '/register')) {
    return NextResponse.redirect(new URL('/bracket', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
