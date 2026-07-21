const fs = require('fs');
const path = require('path');
const multer = require('multer');

const inventoryUploadDir = path.join(__dirname, '../../uploads/inventory');

if (!fs.existsSync(inventoryUploadDir)) {
  fs.mkdirSync(inventoryUploadDir, { recursive: true });
}

const imageFilter = (_req, file, callback) => {
  const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  if (!allowed.includes(file.mimetype)) {
    return callback(new Error('Chỉ chấp nhận ảnh JPG, PNG, WEBP hoặc GIF'));
  }
  return callback(null, true);
};

const inventoryImageStorage = multer.diskStorage({
  destination: (_req, _file, callback) => {
    callback(null, inventoryUploadDir);
  },
  filename: (_req, file, callback) => {
    const ext = path.extname(file.originalname || '').toLowerCase() || '.jpg';
    const safeExt = ['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(ext) ? ext : '.jpg';
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    callback(null, `product-${unique}${safeExt}`);
  }
});

const uploadInventoryImage = multer({
  storage: inventoryImageStorage,
  fileFilter: imageFilter,
  limits: {
    fileSize: 5 * 1024 * 1024
  }
}).single('image');

module.exports = {
  uploadInventoryImage,
  inventoryUploadDir
};
