import React from "react";
import {
  BarChart2,
  Calendar,
  HelpCircle,
  LayoutDashboard,
  Package,
  Plus,
  Shield,
  User,
  Users,
  Wrench,
} from "lucide-react";
import InventoryModule from "../inventory/InventoryModule";
import "../../styles/admin/AdminDashboard.css";
import AdminSidebar from "../../components/AdminSidebar";



export default function AdminInventory({ onViewChange }) {
  return (
    <div className="dashboard-layout">
      <AdminSidebar activeView="inventory" onViewChange={onViewChange} />
      <main className="main-content">
        <div className="content-body">
          <InventoryModule basePath="/admin/inventory" />
        </div>
      </main>
    </div>
  );
}
