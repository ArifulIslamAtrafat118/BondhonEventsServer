const cloudinary = require("../config/cloudinary");
const multer = require("multer");
const { Readable } = require("stream");


// ── Multer: keep files in memory (no disk write) ──────────────────────────────

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {

    const allowed = [
        "image/jpeg",
        "image/png",
        "image/webp",
        "image/gif",
        "video/mp4",
        "video/webm",
        "video/quicktime",
    ];

    if (allowed.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(
            new Error(
                "Unsupported file type. Only images (jpg, png, webp, gif) and videos (mp4, webm, mov) are allowed."
            ),
            false
        );
    }

};

const VIDEO_SIZE_LIMIT = 50 * 1024 * 1024; // 50 MB
const IMAGE_SIZE_LIMIT = 10 * 1024 * 1024; // 10 MB

const limits = (req, file, cb) => {
    if (file.mimetype.startsWith("video/")) {
        cb(null, { fileSize: VIDEO_SIZE_LIMIT });
    } else {
        cb(null, { fileSize: IMAGE_SIZE_LIMIT });
    }
};

const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: VIDEO_SIZE_LIMIT }, // use video limit as ceiling; image guard handled in controller
});


// ── Helper: buffer → cloudinary upload stream ─────────────────────────────────

const uploadToCloudinary = (buffer, options = {}) => {

    return new Promise((resolve, reject) => {

        const uploadStream = cloudinary.uploader.upload_stream(
            options,
            (error, result) => {
                if (error) return reject(error);
                resolve(result);
            }
        );

        const readable = new Readable();
        readable.push(buffer);
        readable.push(null);
        readable.pipe(uploadStream);

    });

};


// ── Controller ────────────────────────────────────────────────────────────────

const uploadMedia = async (req, res) => {

    try {

        if (!req.file) {
            return res.status(400).json({ message: "No file uploaded." });
        }

        const { buffer, mimetype, size } = req.file;
        const isVideo = mimetype.startsWith("video/");

        // Enforce image size limit separately
        if (!isVideo && size > IMAGE_SIZE_LIMIT) {
            return res.status(400).json({
                message: "Image file too large. Maximum 10 MB allowed.",
            });
        }

        const resourceType = isVideo ? "video" : "image";

        const result = await uploadToCloudinary(buffer, {
            resource_type: resourceType,
            folder: "bondhon-events",
        });

        return res.status(200).json({
            secure_url:    result.secure_url,
            public_id:     result.public_id,
            resource_type: result.resource_type,
        });

    } catch (error) {

        console.error("Upload error:", error);

        return res.status(500).json({
            message: error.message || "Upload failed.",
        });

    }

};


module.exports = { upload, uploadMedia };
