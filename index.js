require("dotenv").config();
const express = require("express");
const cors = require("cors");
const app = express();
const PORT = process.env.PORT || 3000;


//middleware
app.use(cors());
app.use(express.json());


app.get("/", (req, res) => {
  res.send("Wellcome to Plantroy");
});
app.listen(PORT, () => {
  console.log(`App is running on PORT: ${PORT}`);
});

module.exports = app;
