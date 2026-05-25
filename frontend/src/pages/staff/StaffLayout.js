import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import "../../styles/staff/StaffCommon.css";
import { Sidebar } from "./StaffComponents";
import StaffAttendance from "./StaffAttendance";
import StaffDashboard from "./StaffDashboard";
import StaffJobDetail, { StaffJobComplete, StaffJobMaterials, StaffJobStart } from "./StaffJobDetail";
import StaffJobs from "./StaffJobs";
import StaffMaterials from "./StaffMaterials";
import StaffProfile from "./StaffProfile";

export default function StaffLayout() {
  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main-content">
        <Routes>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<StaffDashboard />} />
          <Route path="assignments" element={<Navigate to="../jobs" replace />} />
          <Route path="jobs" element={<StaffJobs />} />
          <Route path="jobs/:jobId" element={<StaffJobDetail />} />
          <Route path="jobs/:jobId/start" element={<StaffJobStart />} />
          <Route path="jobs/:jobId/materials" element={<StaffJobMaterials />} />
          <Route path="jobs/:jobId/complete" element={<StaffJobComplete />} />
          <Route path="materials" element={<StaffMaterials />} />
          <Route path="attendance" element={<StaffAttendance />} />
          <Route path="profile" element={<StaffProfile />} />
        </Routes>
      </main>
    </div>
  );
}
