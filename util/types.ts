import { NextRequest } from "next/server";

export type RouteSegmentProps<T> = {
  params: T;
};

export type RouteHandler<T> = (
  request: NextRequest,
  context: RouteSegmentProps<T>
) => Promise<Response>;
