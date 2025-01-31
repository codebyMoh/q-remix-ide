import { NextRequest, NextResponse } from 'next/server';

export function middleware(req: NextRequest) {
  // Here you can write your custom logic for handling requests, like logging, authentication, etc.
  return NextResponse.next(); // Allow the request to continue
}

export const config = {
  matcher: ['/'], // This ensures that the middleware applies to specific routes if needed
};
