import React, { useCallback, useEffect, useState } from "react";
import CustomersWorkspace from "../../components/CustomersWorkspace";
import { getManagerAppointments } from "../../services/managerAppointmentApi";
import { buildCustomerProfiles } from "../../utils/customerOps";
import "../../styles/admin/AdminDashboard.css";
import "../../styles/admin/AdminCustomers.css";

export default function ManagerCustomers() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadCustomers = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const appointmentsPayload = await getManagerAppointments({
        limit: 100,
        sort_by: "appointment_date",
        sort_order: "desc",
      });

      const appointments =
        appointmentsPayload?.data?.appointments || appointmentsPayload?.appointments || [];

      setCustomers(buildCustomerProfiles({ appointments }));
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
    <CustomersWorkspace
      embedded
      customers={customers}
      loading={loading}
      error={error}
      onRefresh={loadCustomers}
      subtitle="Chăm sóc khách hàng"
      title="Khách hàng"
    />
  );
}
