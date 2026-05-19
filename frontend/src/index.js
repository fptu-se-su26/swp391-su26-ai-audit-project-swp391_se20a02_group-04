import React from "react";
import ReactDOM from "react-dom/client";
import { HashRouter } from "react-router-dom";
import StaffLayout from "./pages/staff/StaffLayout";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <HashRouter>
      <StaffLayout />
    </HashRouter>
  </React.StrictMode>
);
