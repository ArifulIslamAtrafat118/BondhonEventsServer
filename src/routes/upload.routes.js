const router = require("express").Router();

const { firebaseTokenVerify, blockStatusCheck } = require("../middlewares/auth.middleware");
const { upload, uploadMedia } = require("../controllers/upload.controller");

// POST /upload
// Auth: Firebase token required + Block check
router.post(
  "/upload",
  firebaseTokenVerify,
  blockStatusCheck,
  upload.single("file"),
  uploadMedia
);

module.exports = router;
