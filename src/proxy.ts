import { NextResponse, type NextRequest } from "next/server";

/**
 * Redirect rapido per le pagine riservate quando manca del tutto il cookie di sessione.
 * È solo un'ottimizzazione UX: la verifica vera (sessione valida, proprietà del viaggio)
 * avviene sempre lato server nelle pagine e nelle API.
 */
export function proxy(request: NextRequest) {
  if (request.cookies.has("travelio_session")) return NextResponse.next();
  const url = request.nextUrl.clone();
  url.pathname = "/accedi";
  url.search = `?next=${encodeURIComponent(request.nextUrl.pathname + request.nextUrl.search)}`;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/viaggi/:path+", "/profilo"],
};
