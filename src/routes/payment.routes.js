const router = require("express").Router();
const {
  createPaymentIntent,
  confirmPayment,
  getEventPaymentHistory,
} = require("../controllers/payment.controller");
const {
  firebaseTokenVerify,
  emailVerify,
  blockStatusCheck,
} = require("../middlewares/auth.middleware");

router.post(
  "/payments/create-payment-intent",
  firebaseTokenVerify,
  blockStatusCheck,
  emailVerify,
  createPaymentIntent
);

router.post(
  "/payments/confirm",
  firebaseTokenVerify,
  blockStatusCheck,
  emailVerify,
  confirmPayment
);

router.get(
  "/payments/event/:eventId",
  firebaseTokenVerify,
  emailVerify,
  getEventPaymentHistory
);

module.exports = router;
