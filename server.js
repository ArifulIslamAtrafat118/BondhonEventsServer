require("dotenv").config();

const app = require("./src/app");
const connectDB = require("./src/config/db");

const {
  setCollection: setEventCollection,
} = require("./src/controllers/event.controller");

const {
  setCollection: setBlogCollection,
} = require("./src/controllers/blog.controller");

const {
  setCollection: setPaymentCollection,
} = require("./src/controllers/payment.controller");

const {
  setCollection: setUserCollection,
} = require("./src/controllers/user.controller");

const PORT = process.env.PORT || 4000;

const startServer = async () => {
  const db = await connectDB();

  setUserCollection(db);
  setEventCollection(db);
  setBlogCollection(db);
  setPaymentCollection(db);

  app.listen(PORT, () => {
    console.log(`Server running on PORT ${PORT}`);
  });
};

startServer();