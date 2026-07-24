const router = require("express").Router();

const eventRoutes  = require("./event.routes");
const uploadRoutes = require("./upload.routes");


router.use(eventRoutes);
router.use(uploadRoutes);


module.exports = router;