const { MongoClient, ServerApiVersion } = require("mongodb");

const uri = `mongodb+srv://${process.env.DB_USER_NAME}:${process.env.DB_USER_PASS}@cluster0.jcx7gas.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});


const connectDB = async () => {
  try {
    await client.connect();

    console.log("MongoDB Connected Successfully");

    return client.db("BondhonEvents");

  } catch(error){
    console.error("MongoDB Connection Failed:", error);
    process.exit(1);
  }
};


module.exports = connectDB;