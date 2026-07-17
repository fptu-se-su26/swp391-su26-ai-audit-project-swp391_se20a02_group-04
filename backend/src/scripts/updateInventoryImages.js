/**
 * Gán ảnh sản phẩm cho các vật tư đang thiếu image_url.
 * Ảnh lấy từ Unsplash (miễn phí, ổn định), map theo danh mục / tên sản phẩm.
 *
 * Chạy: node src/scripts/updateInventoryImages.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/database');
const InventoryItem = require('../models/InventoryItem.model');

const u = (id, sig = '') =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=240&h=240&q=80${sig ? `&sig=${sig}` : ''}`;

/** Ảnh theo danh mục — dùng khi sản phẩm chưa map riêng. */
const BY_CATEGORY = {
  TIRES_TUBES: u('photo-1558981806-ec527fa84c39'), // lốp xe
  LUBRICANTS: u('photo-1635436338433-587707cba45d'), // dầu nhớt / chai
  BRAKE_SYSTEM: u('photo-1486262715619-67b85e0b08d3'), // phụ tùng cơ khí
  FILTERS: u('photo-1619642751034-765dfdf7c58e'), // garage parts
  ELECTRICAL: u('photo-1558618666-fcd25c85cd64'), // điện
  LIGHTS_MIRRORS: u('photo-1492144534655-ae79c964c9d7'), // đèn xe
  TRANSMISSION: u('photo-1558618047-f4b511bba1b4'), // động cơ / truyền động
  SUSPENSION: u('photo-1609630875171-b1321377ee65'), // xe máy
  BODY_PARTS: u('photo-1568772585407-9361f9bf3a87'), // xe máy dàn áo
  ACCESSORIES: u('photo-1571068316344-75bc76f77890'), // phụ kiện
  CONSUMABLES: u('photo-1581092918056-0c4c3acd3789'), // vật tư
  TOOLS_EQUIPMENT: u('photo-1530124566582-a618bc2615dc'), // dụng cụ
  ENGINE_PARTS: u('photo-1487754180451-c456f719a1fc'), // động cơ
  SPARE_PARTS: u('photo-1492144534655-ae79c964c9d7'),
  TOOLS: u('photo-1530124566582-a618bc2615dc'),
  OTHER: u('photo-1558981852-426c6c22aee0'),
};

/** Ảnh riêng theo tên sản phẩm (khớp không phân biệt hoa thường). */
const BY_PRODUCT = {
  'lốp michelin city grip': u('photo-1558981806-ec527fa84c39', 'tire1'),
  'ruột xe irc': u('photo-1558618666-fcd25c85cd64', 'tube1'),
  'dầu nhớt motul 3100': u('photo-1635436338433-587707cba45d', 'oil1'),
  'dầu nhớt honda spx1': u('photo-1635436338433-587707cba45d', 'oil2'),
  'dầu nhớt cửa hàng': u('photo-1635436338433-587707cba45d', 'oil3'),
  'nước làm mát motul': u('photo-1581092918056-0c4c3acd3789', 'cool1'),
  'má phanh elig': u('photo-1486262715619-67b85e0b08d3', 'brake1'),
  'má phanh cửa hàng': u('photo-1486262715619-67b85e0b08d3', 'brake2'),
  'dầu thắng motul dot 4': u('photo-1635436338433-587707cba45d', 'brakeoil'),
  'lọc gió honda': u('photo-1619642751034-765dfdf7c58e', 'filter1'),
  'lọc gió phổ thông': u('photo-1619642751034-765dfdf7c58e', 'filter2'),
  'lọc nhớt': u('photo-1619642751034-765dfdf7c58e', 'filter3'),
  'bugi ngk': u('photo-1558618666-fcd25c85cd64', 'spark1'),
  'ắc quy gs': u('photo-1558618666-fcd25c85cd64', 'bat1'),
  'gương chiếu hậu honda': u('photo-1492144534655-ae79c964c9d7', 'mir1'),
  'bóng đèn led h4': u('photo-1492144534655-ae79c964c9d7', 'led1'),
  'xi nhan led': u('photo-1492144534655-ae79c964c9d7', 'sig1'),
  'dây curoa gates': u('photo-1558618047-f4b511bba1b4', 'belt1'),
  'dây curoa phổ thông': u('photo-1558618047-f4b511bba1b4', 'belt2'),
  'nhông sên dĩa did': u('photo-1558618047-f4b511bba1b4', 'chain1'),
  'phuộc sau kyb': u('photo-1609630875171-b1321377ee65', 'shock1'),
  'ốp sườn vision': u('photo-1568772585407-9361f9bf3a87', 'body1'),
  'yên xe wave': u('photo-1568772585407-9361f9bf3a87', 'seat1'),
  'baga sau': u('photo-1571068316344-75bc76f77890', 'rack1'),
  'giá đỡ điện thoại': u('photo-1571068316344-75bc76f77890', 'phone1'),
  'ốc vít inox': u('photo-1581092918056-0c4c3acd3789', 'bolt1'),
  'keo dán ron': u('photo-1581092918056-0c4c3acd3789', 'seal1'),
  'dây rút nhựa': u('photo-1581092918056-0c4c3acd3789', 'tie1'),
  'dung dịch rửa xe': u('photo-1581092918056-0c4c3acd3789', 'wash1'),
  'piston': u('photo-1487754180451-c456f719a1fc', 'pist1'),
  'bộ nồi': u('photo-1487754180451-c456f719a1fc', 'clutch1'),
  'bộ đồ nghề sửa xe': u('photo-1530124566582-a618bc2615dc', 'tool1'),
  'kích nâng xe máy': u('photo-1530124566582-a618bc2615dc', 'jack1'),
};

function resolveImage(item) {
  const productKey = String(item.product_name || item.item_name || '')
    .trim()
    .toLowerCase();
  if (BY_PRODUCT[productKey]) return BY_PRODUCT[productKey];

  // Khớp một phần tên sản phẩm
  const partial = Object.keys(BY_PRODUCT).find((key) => productKey.includes(key) || key.includes(productKey));
  if (partial) return BY_PRODUCT[partial];

  return BY_CATEGORY[item.category] || BY_CATEGORY.OTHER;
}

async function main() {
  await connectDB();

  const items = await InventoryItem.find({});
  let updated = 0;
  let skipped = 0;

  for (const item of items) {
    const url = resolveImage(item);
    if (!url) {
      skipped += 1;
      continue;
    }
    // Ghi đè placeholder / trống; giữ URL người dùng tự nhập nếu khác Unsplash của script
    const current = (item.image_url || '').trim();
    const isMissing = !current;
    const isOurSeed = current.includes('images.unsplash.com');
    if (!isMissing && !isOurSeed) {
      skipped += 1;
      continue;
    }
    item.image_url = url;
    await item.save();
    updated += 1;
  }

  const withImage = await InventoryItem.countDocuments({
    image_url: { $exists: true, $nin: [null, ''] },
  });

  console.log(`✅ Đã gán ảnh: ${updated}`);
  console.log(`⏭  Bỏ qua: ${skipped}`);
  console.log(`📷 Tổng mã hàng có ảnh: ${withImage}/${items.length}`);

  await mongoose.disconnect();
}

main().catch((error) => {
  console.error('❌', error);
  process.exit(1);
});
