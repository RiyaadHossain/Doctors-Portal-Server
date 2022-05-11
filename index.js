const { MongoClient, ServerApiVersion } = require("mongodb");
const express = require("express");
const app = express();
const cors = require("cors");
require("dotenv").config();
const port = process.env.PORT || 5000;

// Middlewares
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@doctoscluster.6eoyi.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri);
console.log(uri);

async function run() {
  try {
    await client.connect();
    const appointCollection = client
      .db("DoctorsPortal")
      .collection("appointments");

      // Get API
    app.get("/appointments", async (req, res) => {
      const result = await appointCollection.find().toArray();
      res.send(result);
    });
  } finally {
    // Nothing Here
  }
}

run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
