require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion } = require("mongodb");
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

    

    await client.db("admin").command({ ping: 1 });
    console.log("You successfully connected to mongoDb!");
  } catch {
    console.dir;
  }
};
run();

app.get("/", (req, res) => {
  res.send("Wellcome to Plantroy");
});
app.listen(PORT, () => {
  console.log(`App is running on PORT: ${PORT}`);
});

module.exports = app;
