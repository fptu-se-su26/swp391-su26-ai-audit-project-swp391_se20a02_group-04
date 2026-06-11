import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { getAuthSession, getDefaultRouteByRoles, hasAnyRole } from "../services/authApi";

export default function ProtectedRoute({ allowedRoles, children }) {
  const location = useLocation();
  const session = getAuthSession();
  const isLoggedIn = Boolean(session.accessToken && session.user);

  if (!isLoggedIn) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles?.length && !hasAnyRole(allowedRoles, session.roles)) {
    return <Navigate to={getDefaultRouteByRoles(session.roles)} replace />;
  }

  return children;
}
