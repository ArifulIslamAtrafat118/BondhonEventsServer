const router = require("express").Router();

const {
  getAllBlogs,
  getBlogById,
  createBlog,
  updateBlog,
  deleteBlog,
  getMyBlogs,
} = require("../controllers/blog.controller");

const { firebaseTokenVerify, emailVerify } = require("../middlewares/auth.middleware");

router.get("/blogs", getAllBlogs);
router.get("/blogs/:id", getBlogById);
router.get("/my-blogs/:uid", firebaseTokenVerify, emailVerify, getMyBlogs);
router.post("/blogs", firebaseTokenVerify, emailVerify, createBlog);
router.put("/blogs/:id", firebaseTokenVerify, emailVerify, updateBlog);
router.delete("/blogs/:id", firebaseTokenVerify, emailVerify, deleteBlog);

module.exports = router;
