import React from "react";
import { Icon, PageHeader } from "./StaffComponents";
import "../../styles/staff/StaffProfile.css";

export default function StaffProfile() {
  return (
    <>
      <PageHeader title="Hồ sơ nhân viên" subtitle="Thông tin cá nhân, kỹ năng và hiệu suất làm việc" actions={false} />
      <div className="page-grid">
        <section className="profile-card">
          <div className="profile-cover">
            <div className="profile-avatar-large">
              <Icon name="engineering" />
            </div>
          </div>
          <h3>Trần Minh Khoa</h3>
          <p>Nhân viên kỹ thuật - ST024</p>
          <div className="profile-badges">
            <span>Rửa xe</span>
            <span>Sửa cơ bản</span>
            <span>Thay nhớt</span>
          </div>
          <div className="profile-score">
            <div>
              <strong>91%</strong>
              <span>Hiệu suất</span>
            </div>
            <div>
              <strong>4.8</strong>
              <span>Đánh giá</span>
            </div>
            <div>
              <strong>126</strong>
              <span>Việc xong</span>
            </div>
          </div>
        </section>

        <section className="panel wide-panel profile-form">
          <h3>
            <Icon name="person" />
            Thông tin liên hệ
          </h3>
          <div className="form-grid">
            <label>
              Họ tên
              <input defaultValue="Trần Minh Khoa" />
            </label>
            <label>
              Mã nhân viên
              <input defaultValue="ST024" />
            </label>
            <label>
              Số điện thoại
              <input defaultValue="0912 345 678" />
            </label>
            <label>
              Email
              <input defaultValue="khoa.staff@motocare.vn" />
            </label>
            <label>
              Chuyên môn
              <input defaultValue="Sửa xe cơ bản, rửa xe, bảo dưỡng" />
            </label>
            <label>
              Ca làm mặc định
              <input defaultValue="07:30 - 17:30" />
            </label>
          </div>
          <button className="primary-button" type="button">Cập nhật hồ sơ</button>
        </section>
      </div>
    </>
  );
}
