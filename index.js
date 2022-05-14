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

async function run() {
  try {
    await client.connect();
    const appointCollection = client
      .db("DoctorsPortal")
      .collection("appointments");

    const bookingCollection = client
      .db("DoctorsPortal")
      .collection("bookings");

      // Get API
    app.get("/appointments", async (req, res) => {
      const result = await appointCollection.find().toArray();
      res.send(result);
    });


    // Post API
    app.post("/booking", async(req, res) => {
      const booking = req.body
      const query = {treatmentName: booking.treatmentName, treatmentDate: booking.treatmentDate, patientEmail: booking.patientEmail, slot: booking.slot}
      console.log(query);
      const alreadyBooked = await bookingCollection.findOne(query)
      if(alreadyBooked){
        return res.send({success: false, error: `Already Booked on ${query.treatmentDate} at ${query.slot}`})
      }
      const result= await bookingCollection.insertOne(booking)
      res.send({success: true, message: `Booked ${booking.treatmentDate} at ${booking.slot}`})
    })


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
