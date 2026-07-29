const router = require("express").Router();

const eventRoutes  = require("./event.routes");
const uploadRoutes = require("./upload.routes");
const blogRoutes = require("./blog.routes");


router.use(eventRoutes);
router.use(uploadRoutes);
router.use(blogRoutes);


module.exports = router;
