import React, { useCallback, useEffect, useState } from "react";
import AdminSidebar from "../../components/AdminSidebar";
import CustomersWorkspace from "../../components/CustomersWorkspace";
import { adminUserService } from "../../services/adminUserService";
import { getAdminAppointments } from "../../services/adminAppointmentApi";
import { buildCustomerProfiles } from "../../utils/customerOps";
import "../../styles/admin/AdminDashboard.css";
import "../../styles/admin/AdminCustomers.css";

export default function AdminCustomers({ onViewChange }) {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadCustomers = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [usersPayload, appointmentsPayload] = await Promise.all([
        adminUserService.listUsers({ role: "CUSTOMER", limit: 100 }),
        getAdminAppointments({ limit: 100, sort_by: "appointment_date", sort_order: "desc" }),
      ]);

      const users = usersPayload?.users || [];
      const appointments = appointmentsPayload?.data?.appointments || appointmentsPayload?.appointments || [];

      setCustomers(buildCustomerProfiles({ users, appointments }));
    } catch (err) {
      setError(err.message || "Không thể tải danh sách khách hàng");
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  return (
    <div className="customers-layout dashboard-layout">
      <AdminSidebar activeView="customers" onViewChange={onViewChange} />
      <main className="main-content">
        <CustomersWorkspace
          customers={customers}
          loading={loading}
          error={error}
          onRefresh={loadCustomers}
          subtitle="Hồ sơ vận hành garage"
          title="Khách hàng"
        />
      </main>
    </div>
  );
}
