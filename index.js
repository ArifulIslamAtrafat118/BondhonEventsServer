require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const app = express();
const admin = require("firebase-admin");
const serviceAccount = require("./bondhonevents-firebase-adminsdk-fbsvc-daa07b4084.json");
// const decoded = Buffer.from(process.env.FB_SERVICE_KEY, 'base64').toString('utf8');
// const serviceAccount = JSON.parse(decoded);
const PORT = process.env.PORT || 3000;

//middleware
app.use(cors());
app.use(express.json());

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const firebaseTokenVerify = async (req, res, next) => {
  const authHeader = req.headers?.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).send({ message: "Unauthorized Access" });
  }

  const token = authHeader.split(" ")[1];
  try {
    const decoded = await admin.auth().verifyIdToken(token);
    req.decoded = decoded;
    // console.log("Decoded:", decoded);
    next();
  } catch (error) {
    console.error("Token verification failed:", error);
    res.status(401).send({ message: "Unauthorized Access" });
  }
};
const emailVerify = async (req, res, next) => {
  if (req.query.email != req.decoded.email) {
    res.status(403).send({ message: "Forbidden Access!" });
    return;
  }
  next();
};

const uri = `mongodb+srv://${process.env.DB_USER_NAME}:${process.env.DB_USER_PASS}@cluster0.jcx7gas.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});
const run = async () => {
  try {
    // await client.connect();
    const eventsColl = client.db("BondhonEvents").collection("events");

    //public api
    app.get("/upcoming-events", async (req, res) => {
      try {
        const events = await eventsColl.find().sort({ date: 1 }).toArray();

        const today = new Date();
        const upcoming = events.filter((event) => new Date(event.date) >= today);

        res.send(upcoming);
      } catch (error) {
        console.error("Error fetching upcoming events:", error);
        res.status(500).send({ error: "Internal Server Error" });
      }
    });

    app.get(
      "/event-details/:id",
      firebaseTokenVerify,
      emailVerify,
      async (req, res) => {
        const result = await eventsColl.findOne({
          _id: new ObjectId(req.params.id),
        });
        res.send(result);
      }
    );
    app.get(
      "/joined-events/:uid",
      firebaseTokenVerify,
      emailVerify,
      async (req, res) => {
        const uid = req.params.uid;
        const result = await eventsColl
          .find({ joined: uid })
          .sort({ date: 1 })
          .toArray();
        res.send(result);
      }
    );

    app.get(
      "/manage-my-events/:uid",
      firebaseTokenVerify,
      emailVerify,
      async (req, res) => {
        const result = await eventsColl
          .find({ "author.uid": req.params.uid })
          .toArray();
        res.send(result);
      }
    );

    app.post("/create-events", firebaseTokenVerify, emailVerify, (req, res) => {
      const result = eventsColl.insertOne(req.body);
      res.send(result);
    });

    app.put(
      "/update-events/:id",
      firebaseTokenVerify,
      emailVerify,
      async (req, res) => {
        const updateFields = { ...req.body };
        delete updateFields._id;
        const result = await eventsColl.updateOne(
          { _id: new ObjectId(req.params.id) },
          { $set: updateFields }
        );
        res.send(result);
      }
    );

    app.patch(
      "/event/:id/join",
      firebaseTokenVerify,
      emailVerify,
      async (req, res) => {
        const quere = { _id: new ObjectId(req.params.id) };
        const updateDoc = {
          $set: req.body,
        };
        const result = await eventsColl.updateOne(quere, updateDoc);
        res.send(result);
      }
    );

    app.delete(
      "/event/delete/:id",
      firebaseTokenVerify,
      emailVerify,
      async (req, res) => {
        const result = await eventsColl.deleteOne({
          _id: new ObjectId(req.params.id),
        });
        res.send(result);
      }
    );

    // await client.db("admin").command({ ping: 1 });
    // console.log("You successfully connected to mongoDb!");
  } catch {
    console.dir;
  }
};
run();

app.get("/", (req, res) => {
  res.send("Wellcome to Bondhon Events");
});
app.listen(PORT, () => {
  console.log(`App is running on PORT: ${PORT}`);
});

module.exports = app;
