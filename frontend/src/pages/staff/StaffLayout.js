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
          <Route path="/" element={<Navigate to="/staff/dashboard" replace />} />
          <Route path="/staff" element={<Navigate to="/staff/dashboard" replace />} />
          <Route path="/staff/dashboard" element={<StaffDashboard />} />
          <Route path="/staff/assignments" element={<Navigate to="/staff/jobs" replace />} />
          <Route path="/staff/jobs" element={<StaffJobs />} />
          <Route path="/staff/jobs/:jobId" element={<StaffJobDetail />} />
          <Route path="/staff/jobs/:jobId/start" element={<StaffJobStart />} />
          <Route path="/staff/jobs/:jobId/materials" element={<StaffJobMaterials />} />
          <Route path="/staff/jobs/:jobId/complete" element={<StaffJobComplete />} />
          <Route path="/staff/materials" element={<StaffMaterials />} />
          <Route path="/staff/attendance" element={<StaffAttendance />} />
          <Route path="/staff/profile" element={<StaffProfile />} />
        </Routes>
      </main>
    </div>
  );
}
