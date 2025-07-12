require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const app = express();
const PORT = process.env.PORT || 3000;

//middleware
app.use(cors());
app.use(express.json());

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
    await client.connect();

    const eventsColl = client.db("BondhonEvents").collection("events");
    app.get("/upcoming-events", async (req, res) => {
      const result = await eventsColl.find().toArray();
      res.send(result);
    });
    app.get("/event-details/:id", async (req, res) => {
      console.log(req.params.id);
      const result = await eventsColl.findOne({
        _id: new ObjectId(req.params.id),
      });
      // console.log(result);
      res.send(result);
    });

    app.post("/create-events", (req, res) => {
      console.log(req.body);
      const result = eventsColl.insertOne(req.body);
      res.send(result);
    });
    
    app.patch("/event/:id/join", async (req, res) => {
      const quere = { _id: new ObjectId(req.params.id) };
      const updateDoc = {
        $set: req.body,
      };
      const result = await eventsColl.updateOne(quere, updateDoc);
      res.send(result);
    });
    
    await client.db("admin").command({ ping: 1 });
    console.log("You successfully connected to mongoDb!");
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
