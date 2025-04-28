const multer = require('multer');

const storage = multer.memoryStorage(); // Store temporarily in memory

const upload = multer({ storage });

module.exports = upload;
