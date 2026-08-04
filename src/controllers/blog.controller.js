const { ObjectId } = require("mongodb");

let blogsColl;

const setCollection = (db) => {
  blogsColl = db.collection("blogs");
};

const getAllBlogs = async (req, res) => {
  try {
    const blogs = await blogsColl.find().sort({ createdAt: -1 }).toArray();
    res.send(blogs);
  } catch (error) {
    res.status(500).send({ message: "Failed to load blogs." });
  }
};

const getBlogById = async (req, res) => {
  try {
    const blog = await blogsColl.findOne({ _id: new ObjectId(req.params.id) });
    if (!blog) {
      return res.status(404).send({ message: "Blog not found." });
    }
    res.send(blog);
  } catch (error) {
    res.status(500).send({ message: "Failed to load blog." });
  }
};

const createBlog = async (req, res) => {
  try {
    const blog = {
      ...req.body,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const result = await blogsColl.insertOne(blog);
    res.status(201).send({ insertedId: result.insertedId });
  } catch (error) {
    res.status(500).send({ message: "Failed to create blog." });
  }
};

const updateBlog = async (req, res) => {
  try {
    const updateFields = { ...req.body, updatedAt: new Date().toISOString() };
    delete updateFields._id;

    const result = await blogsColl.updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: updateFields }
    );

    if (result.matchedCount === 0) {
      return res.status(404).send({ message: "Blog not found." });
    }

    res.send(result);
  } catch (error) {
    res.status(500).send({ message: "Failed to update blog." });
  }
};

const deleteBlog = async (req, res) => {
  try {
    const result = await blogsColl.deleteOne({ _id: new ObjectId(req.params.id) });
    if (result.deletedCount === 0) {
      return res.status(404).send({ message: "Blog not found." });
    }
    res.send(result);
  } catch (error) {
    res.status(500).send({ message: "Failed to delete blog." });
  }
};

const getMyBlogs = async (req, res) => {
  try {
    const blogs = await blogsColl
      .find({ "author.uid": req.params.uid })
      .sort({ createdAt: -1 })
      .toArray();

    res.send(blogs);
  } catch (error) {
    res.status(500).send({ message: "Failed to load your blogs." });
  }
};

module.exports = {
  setCollection,
  getAllBlogs,
  getBlogById,
  createBlog,
  updateBlog,
  deleteBlog,
  getMyBlogs,
};
