const fs = require("fs");
const path = require("path");

const rootDir = path.resolve(__dirname, "..");
const buildDir = path.join(rootDir, "build");
const outputDir = path.join(rootDir, "github-pages");

const staffJobId = "APT-20260519-015";

const pages = [
  { file: "index.html", route: "/home", title: "MotoCare - Trang chủ" },
  { file: "home.html", route: "/home", title: "MotoCare - Trang chủ" },
  { file: "about.html", route: "/about", title: "MotoCare - Về chúng tôi" },
  { file: "login.html", route: "/login", title: "MotoCare - Đăng nhập" },
  { file: "register.html", route: "/register", title: "MotoCare - Đăng ký" },
  { file: "verify-otp.html", route: "/verify-otp", title: "MotoCare - Xác thực OTP" },
  { file: "forgot-password.html", route: "/forgot-password", title: "MotoCare - Quên mật khẩu" },
  { file: "reset-password.html", route: "/reset-password", title: "MotoCare - Đặt lại mật khẩu" },
  { file: "booking.html", route: "/booking", title: "MotoCare - Đặt lịch", role: "CUSTOMER" },
  { file: "customer-profile.html", route: "/profile", title: "MotoCare - Hồ sơ khách hàng", role: "CUSTOMER" },
  { file: "admin.html", route: "/admin", title: "MotoCare - Quản trị", role: "ADMIN" },
  { file: "staff-dashboard.html", route: "/staff/dashboard", title: "MotoCare Staff - Tổng quan", role: "STAFF" },
  { file: "staff-jobs.html", route: "/staff/jobs", title: "MotoCare Staff - Công việc", role: "STAFF" },
  { file: "staff-job-detail.html", route: `/staff/jobs/${staffJobId}`, title: "MotoCare Staff - Chi tiết công việc", role: "STAFF" },
  { file: "staff-job-start.html", route: `/staff/jobs/${staffJobId}/start`, title: "MotoCare Staff - Bắt đầu công việc", role: "STAFF" },
  { file: "staff-job-materials.html", route: `/staff/jobs/${staffJobId}/materials`, title: "MotoCare Staff - Vật tư công việc", role: "STAFF" },
  { file: "staff-job-complete.html", route: `/staff/jobs/${staffJobId}/complete`, title: "MotoCare Staff - Hoàn thành công việc", role: "STAFF" },
  { file: "staff-materials.html", route: "/staff/materials", title: "MotoCare Staff - Vật tư", role: "STAFF" },
  { file: "staff-attendance.html", route: "/staff/attendance", title: "MotoCare Staff - Chấm công", role: "STAFF" },
  { file: "staff-profile.html", route: "/staff/profile", title: "MotoCare Staff - Hồ sơ", role: "STAFF" },
];

function ensureBuildExists() {
  const indexPath = path.join(buildDir, "index.html");

  if (!fs.existsSync(indexPath)) {
    throw new Error("Missing build/index.html. Run `npm run build` before generating static pages.");
  }
}

function resetOutputDir() {
  fs.rmSync(outputDir, { recursive: true, force: true });
  fs.mkdirSync(outputDir, { recursive: true });
}

function copyBuildAssets() {
  for (const item of fs.readdirSync(buildDir)) {
    if (item === "index.html") continue;

    const source = path.join(buildDir, item);
    const target = path.join(outputDir, item);
    fs.cpSync(source, target, { recursive: true });
  }
}

function base64Url(value) {
  return Buffer.from(JSON.stringify(value))
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function createPreviewToken(role) {
  const header = base64Url({ alg: "HS256", typ: "JWT" });
  const payload = base64Url({
    sub: `static-${role.toLowerCase()}`,
    role,
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 365,
  });

  return `${header}.${payload}.static-preview`;
}

function getPreviewUser(role) {
  const users = {
    ADMIN: {
      id: "AD001",
      full_name: "Admin MotoCare",
      email: "admin@motocare.local",
      roles: ["ADMIN"],
    },
    STAFF: {
      id: "ST024",
      full_name: "Trần Minh Khoa",
      email: "staff@motocare.local",
      roles: ["STAFF"],
    },
    CUSTOMER: {
      id: "CU001",
      full_name: "Nguyễn Hoàng Nam",
      email: "customer@motocare.local",
      roles: ["CUSTOMER"],
    },
  };

  return users[role] || users.CUSTOMER;
}

function createBootScript(page) {
  const lines = [
    "window.__MOTOCARE_STATIC_ROUTE__ = " + JSON.stringify(page.route) + ";",
  ];

  if (page.role) {
    const token = createPreviewToken(page.role);
    const user = getPreviewUser(page.role);

    lines.push(
      "localStorage.setItem('accessToken', " + JSON.stringify(token) + ");",
      "localStorage.setItem('refreshToken', " + JSON.stringify(token) + ");",
      "localStorage.setItem('authUser', " + JSON.stringify(JSON.stringify(user)) + ");",
      "localStorage.setItem('authRoles', " + JSON.stringify(JSON.stringify([page.role])) + ");"
    );
  }

  return `<script>${lines.join("")}</script>`;
}

function createPageHtml(template, page) {
  const html = template
    .replace(/(src|href)="\/static\//g, '$1="./static/')
    .replace(/<title>.*?<\/title>/, `<title>${page.title}</title>`);

  return html.replace("<script defer", `${createBootScript(page)}<script defer`);
}

function writePages() {
  const template = fs.readFileSync(path.join(buildDir, "index.html"), "utf8");

  for (const page of pages) {
    fs.writeFileSync(path.join(outputDir, page.file), createPageHtml(template, page), "utf8");
  }

  fs.writeFileSync(
    path.join(outputDir, "README.md"),
    [
      "# MotoCare GitHub Pages Static Preview",
      "",
      "Folder này được sinh từ React build để phục vụ demo tĩnh trên GitHub Pages.",
      "",
      "Chạy lại khi giao diện thay đổi:",
      "",
      "```bash",
      "npm run static:pages",
      "```",
      "",
      "Các trang HTML chính:",
      "",
      ...pages.map((page) => `- ${page.file}: ${page.route}`),
      "",
    ].join("\n"),
    "utf8"
  );
}

ensureBuildExists();
resetOutputDir();
copyBuildAssets();
writePages();

console.log(`Generated ${pages.length} static HTML pages in ${path.relative(rootDir, outputDir)}.`);
