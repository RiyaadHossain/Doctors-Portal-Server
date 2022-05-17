const { MongoClient, ServerApiVersion } = require("mongodb");
const express = require("express");
const app = express();
const cors = require("cors");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const port = process.env.PORT || 5000;

// Middlewares
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@doctoscluster.6eoyi.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri);

const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).send({ message: "UnAuthorized access" });
  }
  const token = authHeader.split(" ")[1];
  jwt.verify(token, process.env.ACCESS_TOKEN, (err, decoded) => {
    if (err) {
      return res.status(403).send({ message: "Forbidden access" });
    }
    req.decoded = decoded;

    next();
  });
};

async function run() {
  try {
    await client.connect();
    const appointCollection = client
      .db("DoctorsPortal")
      .collection("appointments");

    const bookingCollection = client.db("DoctorsPortal").collection("bookings");

    const userCollection = client.db("DoctorsPortal").collection("users");

    const doctorCollection = client.db("DoctorsPortal").collection("doctors");

    // Get API - Appointments
    app.get("/appointments", async (req, res) => {
      const result = await appointCollection.find().project({name: 1}).toArray();
      res.send(result);
    });

    // Get API - Bookings
    app.get("/booking", verifyToken, async (req, res) => {
      const patientEmail = req.query.patient;
      const patientToken = req.decoded.email;
      if (patientEmail === patientToken) {
        const query = { patientEmail: patientEmail };
        const result = await bookingCollection.find(query).toArray();
        return res.send(result);
      }
      res.status(401).send({ message: "Forbidden Request" });
    });

    // Get API - Users
    app.get("/users", verifyToken, async (req, res) => {
      const result = await userCollection.find().toArray();
      res.send(result);
    });

    // Get API - useAdmin [hook]
    app.get("/users/:email", async (req, res) => {
      const email = req.params.email
      const user = await userCollection.findOne({email: email})
      const isAdmin = user?.role === 'admin'
      res.send({admin : isAdmin})
    })

    // PUT API - Admin Users
    app.put("/users/admin/:email", verifyToken, async (req, res) => {
      const email = req.params.email;
      const filter = { email: email };
      const requester = req.decoded.email;
      const requesterUser = await userCollection.findOne({
        email: requester,
      });
      if (requesterUser.role === "admin") {
        const updatedDoc = {
          $set: { role: "admin" },
        };
        const result = await userCollection.updateOne(filter, updatedDoc);
        res.send(result);
      } else {
        res.status(401).send({ message: "Forbidden Request" });
      }
    });

    // Discalimer: It's not the accurate way to query. Learn - Aggregate, Lookup, Pipeline, Match, Group (MongoDB)
    app.get("/availables", async (req, res) => {
      const date = req.query.date;
      console.log(req.query);
      const appointments = await appointCollection.find().toArray();

      const query = { treatmentDate: date };
      const bookedServices = await bookingCollection.find(query).toArray();

      appointments.map((appointment) => {
        const bookedAppointments = bookedServices.filter(
          (slot) => slot.treatmentName === appointment.name
        );
        const bookedSlots = bookedAppointments.map((booking) => booking.slot);
        appointment.slots = appointment.slots.filter(
          (slot) => !bookedSlots.includes(slot)
        );
      });
      res.send(appointments);
    });

    // PUT API - jwt token
    app.put("/user/:email", async (req, res) => {
      const email = req.params.email;
      const user = req.body;
      const filter = { email: email };
      const options = { upsert: true };
      const updatedDoc = {
        $set: user,
      };
      const result = await userCollection.updateOne(
        filter,
        updatedDoc,
        options
      );
      const token = jwt.sign({ email: email }, process.env.ACCESS_TOKEN);
      console.log(token);
      res.send({ result, token });
    });

    // Post API - Appointments Booking
    app.post("/booking", async (req, res) => {
      const booking = req.body;
      const query = {
        treatmentName: booking.treatmentName,
        treatmentDate: booking.treatmentDate,
        patientEmail: booking.patientEmail,
        slot: booking.slot,
      };
      const alreadyBooked = await bookingCollection.findOne(query);
      if (alreadyBooked) {
        return res.send({
          success: false,
          error: `Already Booked on ${query.treatmentDate} at ${query.slot}`,
        });
      }
      const result = await bookingCollection.insertOne(booking);
      res.send({
        success: true,
        message: `Booked ${booking.treatmentDate} at ${booking.slot}`,
      });
    });

    // Post API - Doctors
    app.post("/adddoctor", async(req, res) => {
      const doctor = req.body
      const result = await doctorCollection.insertOne(doctor)
      res.send(result)
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
