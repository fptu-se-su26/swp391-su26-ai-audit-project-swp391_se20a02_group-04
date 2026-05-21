import React from "react";
import { Link } from "react-router-dom";
import { Icon, PageHeader } from "./StaffComponents";
import { materialUsages, materials } from "./staffData";
import "../../styles/staff/StaffMaterials.css";

export default function StaffMaterials() {
  return (
    <>
      <PageHeader title="Sử dụng vật tư" subtitle="Ghi nhận vật tư đã dùng và theo dõi tồn kho trong ca" />
      <div className="page-grid">
        <section className="panel wide-panel">
          <div className="panel-title-row">
            <h3>
              <Icon name="inventory_2" />
              Tồn kho khả dụng
            </h3>
            <Link className="primary-button" to="/staff/jobs/APT-20260519-015/materials">
              <Icon name="add" />
              Thêm vật tư đã dùng
            </Link>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Mã</th>
                  <th>Tên vật tư</th>
                  <th>Tồn kho</th>
                  <th>Giá</th>
                  <th>Trạng thái</th>
                  <th>Hành động</th>
                </tr>
              </thead>
              <tbody>
                {materials.map((item) => (
                  <tr key={item.code}>
                    <td><strong>{item.code}</strong></td>
                    <td>{item.name}</td>
                    <td>{item.stock} {item.unit}</td>
                    <td>{item.price}</td>
                    <td>
                      <span className={`table-status ${item.stock <= item.min ? "danger" : "text-green"}`}>
                        <Icon name={item.stock <= item.min ? "warning" : "check_circle"} />
                        {item.status}
                      </span>
                    </td>
                    <td>
                      <Link className="secondary-button small-button" to="/staff/jobs/APT-20260519-015/materials">Sử dụng</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <aside className="side-column">
          <section className="panel">
            <h3>
              <Icon name="receipt_long" />
              Vật tư đã dùng
            </h3>
            <div className="usage-list">
              {materialUsages.map((usage) => (
                <div className="usage-item" key={`${usage.jobId}-${usage.material}`}>
                  <div>
                    <strong>{usage.material}</strong>
                    <span>#{usage.jobId}</span>
                  </div>
                  <p>{usage.quantity}</p>
                  <b>{usage.cost}</b>
                </div>
              ))}
            </div>
          </section>

          <section className="panel material-form">
            <h3>
              <Icon name="post_add" />
              Ghi nhận nhanh
            </h3>
            <label>Công việc</label>
            <select defaultValue="APT-20260519-015">
              <option>APT-20260519-015</option>
              <option>APT-20260519-014</option>
            </select>
            <label>Vật tư</label>
            <select defaultValue="Nhớt 10W40">
              <option>Nhớt 10W40</option>
              <option>Bugi NGK</option>
              <option>Dung dịch rửa xe</option>
            </select>
            <label>Số lượng</label>
            <input type="number" defaultValue="1" min="1" />
            <Link className="primary-button full" to="/staff/jobs/APT-20260519-015/complete">Lưu vật tư</Link>
          </section>
        </aside>
      </div>
    </>
  );
}
