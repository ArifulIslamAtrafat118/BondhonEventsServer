const { ObjectId } = require("mongodb");

let usersColl;

const SUPER_ADMIN_UID = "Jt5CbqrVy3QXN6cMMU0PzYmvVwN2";
const SUPER_ADMIN_EMAIL = "arafatarifulislam611@gmail.com";

const setCollection = (db) => {
  usersColl = db.collection("users");
};

const getUsersCollection = () => usersColl;

// Helper to auto-resolve expired blocks
const checkAndResolveBlock = async (user) => {
  if (!user || !user.blockInfo || !user.blockInfo.isBlocked) {
    return user;
  }

  // If temporary block has expired
  if (user.blockInfo.blockedUntil && new Date(user.blockInfo.blockedUntil) <= new Date()) {
    const unblockedState = {
      accountStatus: "active",
      blockInfo: {
        isBlocked: false,
        reason: "",
        blockedAt: null,
        blockedUntil: null,
        blockedBy: null,
      },
    };

    await usersColl.updateOne({ uid: user.uid }, { $set: unblockedState });
    return { ...user, ...unblockedState };
  }

  return user;
};

// Helper for statistics update
const updateUserStatistics = async (uid, statChanges) => {
  if (!usersColl || !uid) return;
  try {
    const incObj = {};
    for (const [key, val] of Object.entries(statChanges)) {
      incObj[`statistics.${key}`] = val;
    }
    await usersColl.updateOne({ uid }, { $inc: incObj });
  } catch (err) {
    console.error("Failed to update user statistics:", err);
  }
};

// POST /users/sync
const syncUser = async (req, res) => {
  try {
    const { uid, email } = req.decoded;
    const body = req.body || {};

    const name = body.name || req.decoded.name || req.decoded.displayName || email?.split("@")[0] || "User";
    const photoURL = body.photoURL || req.decoded.picture || req.decoded.photoURL || "";

    const existingUser = await usersColl.findOne({ uid });

    const isSuperAdmin = uid === SUPER_ADMIN_UID || email === SUPER_ADMIN_EMAIL;
    const targetRole = isSuperAdmin ? "super_admin" : (existingUser?.role || "user");

    if (!existingUser) {
      const newUser = {
        uid,
        name,
        email: email || "",
        photoURL,
        phone: body.phone || "",
        gender: body.gender || "",
        dateOfBirth: body.dateOfBirth || "",
        address: {
          country: body.address?.country || "",
          division: body.address?.division || "",
          district: body.address?.district || "",
          city: body.address?.city || "",
          postalCode: body.address?.postalCode || "",
        },
        bio: body.bio || "",
        profession: body.profession || "",
        interests: Array.isArray(body.interests) ? body.interests : [],
        joinedAt: new Date(),
        lastLoginAt: new Date(),
        role: targetRole,
        accountStatus: "active",
        blockInfo: {
          isBlocked: false,
          reason: "",
          blockedAt: null,
          blockedUntil: null,
          blockedBy: null,
        },
        statistics: {
          eventsCreated: 0,
          eventsJoined: 0,
          donations: 0,
          volunteeringHours: 0,
        },
      };

      await usersColl.insertOne(newUser);
      return res.status(201).json(newUser);
    }

    // Resolve temporary block if expired
    const resolvedUser = await checkAndResolveBlock(existingUser);

    const updateDoc = {
      name: name || resolvedUser.name,
      email: email || resolvedUser.email,
      photoURL: photoURL || resolvedUser.photoURL,
      lastLoginAt: new Date(),
      role: targetRole,
      accountStatus: resolvedUser.accountStatus,
      blockInfo: resolvedUser.blockInfo,
    };

    await usersColl.updateOne({ uid }, { $set: updateDoc });

    const updatedUser = await usersColl.findOne({ uid });
    res.json(updatedUser);
  } catch (error) {
    console.error("syncUser error:", error);
    res.status(500).json({ message: "Failed to sync user." });
  }
};

// GET /users/me
const getMyProfile = async (req, res) => {
  try {
    const { uid } = req.decoded;
    const user = await usersColl.findOne({ uid });

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    const resolvedUser = await checkAndResolveBlock(user);
    res.json(resolvedUser);
  } catch (error) {
    console.error("getMyProfile error:", error);
    res.status(500).json({ message: "Failed to fetch profile." });
  }
};

// PATCH /users/me
const updateMyProfile = async (req, res) => {
  try {
    const { uid } = req.decoded;
    const user = await usersColl.findOne({ uid });

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    const {
      name,
      photoURL,
      phone,
      gender,
      dateOfBirth,
      address,
      profession,
      bio,
      interests,
    } = req.body;

    const updatedFields = {};

    if (typeof name === "string") updatedFields.name = name;
    if (typeof photoURL === "string") updatedFields.photoURL = photoURL;
    if (typeof phone === "string") updatedFields.phone = phone;
    if (typeof gender === "string") updatedFields.gender = gender;
    if (typeof dateOfBirth === "string") updatedFields.dateOfBirth = dateOfBirth;
    if (typeof profession === "string") updatedFields.profession = profession;
    if (typeof bio === "string") updatedFields.bio = bio;
    if (Array.isArray(interests)) updatedFields.interests = interests;

    if (address && typeof address === "object") {
      updatedFields.address = {
        country: address.country || user.address?.country || "",
        division: address.division || user.address?.division || "",
        district: address.district || user.address?.district || "",
        city: address.city || user.address?.city || "",
        postalCode: address.postalCode || user.address?.postalCode || "",
      };
    }

    await usersColl.updateOne({ uid }, { $set: updatedFields });

    const updatedUser = await usersColl.findOne({ uid });
    res.json(updatedUser);
  } catch (error) {
    console.error("updateMyProfile error:", error);
    res.status(500).json({ message: "Failed to update profile." });
  }
};

// GET /admin/users
const getAdminUsers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || "";
    const sortBy = req.query.sortBy || "newest";

    const query = {};

    if (search.trim()) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    let sortObj = { joinedAt: -1 };

    switch (sortBy) {
      case "oldest":
        sortObj = { joinedAt: 1 };
        break;
      case "alphabetical":
        sortObj = { name: 1 };
        break;
      case "eventsCreated":
        sortObj = { "statistics.eventsCreated": -1 };
        break;
      case "lastLogin":
        sortObj = { lastLoginAt: -1 };
        break;
      case "newest":
      default:
        sortObj = { joinedAt: -1 };
        break;
    }

    const total = await usersColl.countDocuments(query);
    const users = await usersColl
      .find(query)
      .sort(sortObj)
      .skip((page - 1) * limit)
      .limit(limit)
      .toArray();

    // Check & resolve expired blocks for each user in result
    const resolvedUsers = await Promise.all(users.map((u) => checkAndResolveBlock(u)));

    res.json({
      users: resolvedUsers,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("getAdminUsers error:", error);
    res.status(500).json({ message: "Failed to fetch users list." });
  }
};

// GET /admin/users/:uid
const getAdminUserByUid = async (req, res) => {
  try {
    const { uid } = req.params;
    const user = await usersColl.findOne({ uid });

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    const resolvedUser = await checkAndResolveBlock(user);
    res.json(resolvedUser);
  } catch (error) {
    console.error("getAdminUserByUid error:", error);
    res.status(500).json({ message: "Failed to fetch user details." });
  }
};

// PATCH /admin/users/:uid/block
const blockUser = async (req, res) => {
  try {
    const { uid } = req.params;
    const { reason, durationDays } = req.body;

    const user = await usersColl.findOne({ uid });
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    if (user.uid === SUPER_ADMIN_UID) {
      return res.status(400).json({ message: "Super Admin cannot be blocked." });
    }

    let blockedUntil = null;
    if (durationDays && typeof durationDays === "number" && durationDays > 0) {
      blockedUntil = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000);
    }

    const blockInfo = {
      isBlocked: true,
      reason: reason || "Violation of community guidelines.",
      blockedAt: new Date(),
      blockedUntil,
      blockedBy: {
        uid: req.decoded.uid,
        name: req.decoded.name || req.decoded.displayName || "Super Admin",
        email: req.decoded.email || SUPER_ADMIN_EMAIL,
      },
    };

    await usersColl.updateOne(
      { uid },
      {
        $set: {
          accountStatus: "blocked",
          blockInfo,
        },
      }
    );

    const updatedUser = await usersColl.findOne({ uid });
    res.json({
      success: true,
      message: `User successfully blocked.`,
      user: updatedUser,
    });
  } catch (error) {
    console.error("blockUser error:", error);
    res.status(500).json({ message: "Failed to block user." });
  }
};

// PATCH /admin/users/:uid/unblock
const unblockUser = async (req, res) => {
  try {
    const { uid } = req.params;

    const user = await usersColl.findOne({ uid });
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    const unblockedState = {
      accountStatus: "active",
      blockInfo: {
        isBlocked: false,
        reason: "",
        blockedAt: null,
        blockedUntil: null,
        blockedBy: null,
      },
    };

    await usersColl.updateOne({ uid }, { $set: unblockedState });

    const updatedUser = await usersColl.findOne({ uid });
    res.json({
      success: true,
      message: "User successfully unblocked.",
      user: updatedUser,
    });
  } catch (error) {
    console.error("unblockUser error:", error);
    res.status(500).json({ message: "Failed to unblock user." });
  }
};

module.exports = {
  setCollection,
  getUsersCollection,
  checkAndResolveBlock,
  updateUserStatistics,
  syncUser,
  getMyProfile,
  updateMyProfile,
  getAdminUsers,
  getAdminUserByUid,
  blockUser,
  unblockUser,
};
