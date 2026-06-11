import React from "react";
import "./AuthHomeLogo.css";

const LOGO_SRC = "https://img.pikbest.com/png-images/service-repair-logo-design-inspiration_1799373.png!f305cw";

export default function AuthHomeLogo({ className = "" }) {
  return (
    <a className={`auth-home-logo ${className}`.trim()} href="/home" aria-label="Ve trang chu MOTOCORE">
      <img alt="MOTOCORE" src={LOGO_SRC} />
      <span>MOTOCORE</span>
    </a>
  );
}
