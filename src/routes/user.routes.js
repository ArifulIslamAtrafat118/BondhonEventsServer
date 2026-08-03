const router = require("express").Router();
const {
  syncUser,
  getMyProfile,
  updateMyProfile,
  getAdminUsers,
  getAdminUserByUid,
  blockUser,
  unblockUser,
} = require("../controllers/user.controller");

const {
  firebaseTokenVerify,
  superAdminOnly,
} = require("../middlewares/auth.middleware");

// User synchronization
router.post("/users/sync", firebaseTokenVerify, syncUser);

// User profile management
router.get("/users/me", firebaseTokenVerify, getMyProfile);
router.patch("/users/me", firebaseTokenVerify, updateMyProfile);

// Admin dashboard & user management
router.get("/admin/users", firebaseTokenVerify, superAdminOnly, getAdminUsers);
router.get("/admin/users/:uid", firebaseTokenVerify, superAdminOnly, getAdminUserByUid);
router.patch("/admin/users/:uid/block", firebaseTokenVerify, superAdminOnly, blockUser);
router.patch("/admin/users/:uid/unblock", firebaseTokenVerify, superAdminOnly, unblockUser);

module.exports = router;
