import React from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
import { getAuthSession, getDefaultRouteByRoles, hasAnyRole } from "../services/authApi";

export default function ProtectedRoute({ allowedRoles, children }) {
  const location = useLocation();
  const session = getAuthSession();
  const isLoggedIn = Boolean(session.accessToken && session.user);

  if (!isLoggedIn) {
    return <LoginRequiredNotice from={location} />;
  }

  if (allowedRoles?.length && !hasAnyRole(allowedRoles, session.roles)) {
    return <Navigate to={getDefaultRouteByRoles(session.roles)} replace />;
  }

  return children;
}

function LoginRequiredNotice({ from }) {
  return (
    <main className="route-message-page">
      <section className="route-message-card">
        <span className="material-symbols-outlined route-message-icon">lock</span>
        <p className="route-message-eyebrow">Yêu cầu đăng nhập</p>
        <h1>Không thể truy cập trang lịch hẹn</h1>
        <p>
          Chức năng đặt lịch chỉ được sử dụng khi bạn đã đăng nhập. Vui lòng tiến hành
          đăng nhập để tiếp tục đặt lịch sửa và rửa xe máy.
        </p>
        <div className="route-message-actions">
          <Link className="route-message-primary" to="/login" state={{ from }}>
            Đăng nhập để tiếp tục
          </Link>
          <Link className="route-message-secondary" to="/home">
            Quay về trang chủ
          </Link>
        </div>
      </section>
    </main>
  );
}
