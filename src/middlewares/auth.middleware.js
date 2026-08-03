const admin = require("../config/firebase");
const { getUsersCollection, checkAndResolveBlock } = require("../controllers/user.controller");

const SUPER_ADMIN_UID = "Jt5CbqrVy3QXN6cMMU0PzYmvVwN2";
const SUPER_ADMIN_EMAIL = "arafatarifulislam611@gmail.com";

const firebaseTokenVerify = async (req, res, next) => {
  const authHeader = req.headers?.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).send({
      message: "Unauthorized Access",
    });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = await admin.auth().verifyIdToken(token);
    req.decoded = decoded;
    next();
  } catch (error) {
    console.log("Token verification failed:", error);
    res.status(401).send({
      message: "Unauthorized Access",
    });
  }
};

const emailVerify = (req, res, next) => {
  if (req.query.email && req.query.email !== req.decoded.email) {
    return res.status(403).send({
      message: "Forbidden Access!",
    });
  }
  next();
};

const userExists = async (req, res, next) => {
  try {
    const usersColl = getUsersCollection();
    if (!usersColl) {
      return res.status(500).json({ message: "Database user collection unavailable." });
    }

    const user = await usersColl.findOne({ uid: req.decoded.uid });
    if (!user) {
      return res.status(404).json({ message: "User account does not exist in database." });
    }

    // Auto resolve temporary block if expired
    const resolvedUser = await checkAndResolveBlock(user);
    req.user = resolvedUser;
    next();
  } catch (error) {
    console.error("userExists middleware error:", error);
    res.status(500).json({ message: "Failed to verify user existence." });
  }
};

const blockStatusCheck = async (req, res, next) => {
  try {
    const usersColl = getUsersCollection();
    if (!usersColl) {
      return res.status(500).json({ message: "Database user collection unavailable." });
    }

    let user = req.user;
    if (!user) {
      user = await usersColl.findOne({ uid: req.decoded.uid });
    }

    if (!user) {
      return res.status(404).json({ message: "User account not found." });
    }

    const resolvedUser = await checkAndResolveBlock(user);
    req.user = resolvedUser;

    if (resolvedUser.accountStatus === "blocked" || resolvedUser.blockInfo?.isBlocked) {
      return res.status(403).json({
        message: "Your account is temporarily blocked.",
        blockInfo: resolvedUser.blockInfo,
      });
    }

    next();
  } catch (error) {
    console.error("blockStatusCheck error:", error);
    res.status(500).json({ message: "Failed to check block status." });
  }
};

const superAdminOnly = (req, res, next) => {
  const uid = req.decoded?.uid;
  const email = req.decoded?.email;
  const role = req.user?.role;

  const isSuperAdmin =
    uid === SUPER_ADMIN_UID || email === SUPER_ADMIN_EMAIL || role === "super_admin";

  if (!isSuperAdmin) {
    return res.status(403).json({
      message: "Forbidden Access: Super Admin authorization required.",
    });
  }

  next();
};

module.exports = {
  firebaseTokenVerify,
  emailVerify,
  userExists,
  blockStatusCheck,
  superAdminOnly,
};