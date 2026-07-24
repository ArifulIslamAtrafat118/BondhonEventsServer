const router = require("express").Router();

const { firebaseTokenVerify } = require("../middlewares/auth.middleware");
const { upload, uploadMedia }  = require("../controllers/upload.controller");


// POST /upload
// Auth: Firebase token required (no email query needed – upload is generic)
router.post(
    "/upload",
    firebaseTokenVerify,
    upload.single("file"),
    uploadMedia
);


module.exports = router;
