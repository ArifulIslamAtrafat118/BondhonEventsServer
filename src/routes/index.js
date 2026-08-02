const router = require("express").Router();

const eventRoutes  = require("./event.routes");
const uploadRoutes = require("./upload.routes");
const paymentRoutes = require("./payment.routes");

router.use(eventRoutes);
router.use(uploadRoutes);
router.use(paymentRoutes);

module.exports = router;