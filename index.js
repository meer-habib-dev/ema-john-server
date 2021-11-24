const express = require("express");
const app = express();
const cors = require("cors");
const { MongoClient } = require("mongodb");
require("dotenv").config();
var admin = require("firebase-admin");
// const { initializeApp } = require("firebase-admin/app");
const port = process.env.PORT || 5000;

// Firebase admin initilaiztion

var serviceAccount = require("./ema-john-firebase-2fb5f-firebase-adminsdk-486ra-6bea58c990.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

// middle ware
app.use(express.json());
app.use(cors());

// Database
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.uym3z.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});
// console.log(uri);
async function verifyToken(req, res, next) {
  if (req.headers?.authorization?.startsWith("Bearer ")) {
    const idToken = req.headers.authorization.split(" ")[1];
    try {
      const decodedUser = await admin.auth().verifyIdToken(idToken);
      // console.log("Decoded User Email: ", decodedUser.email);
      req.DecodedUserEmail = decodedUser.email;
    } catch {}
  }
  next();
}
async function run() {
  try {
    await client.connect();
    const database = client.db("online_shop");
    const productCollection = database.collection("products");
    const orderCollection = database.collection("orders");
    //   GET API
    app.get("/products", async (req, res) => {
      const cursor = productCollection.find({});
      console.log(req.query);
      const page = req.query.page;
      const size = parseInt(req.query.size);
      let products;
      const count = await cursor.count();
      if (page) {
        products = await cursor
          .skip(page * size)
          .limit(size)
          .toArray();
      } else {
        products = await cursor.toArray();
      }
      //   const products = await cursor.toArray();
      res.send({ count, products });
    });
    //   Post API to get data http://localhost:5000/products/byKeys
    app.post("/products/byKeys", async (req, res) => {
      const keys = req.body;
      const query = { key: { $in: keys } };
      const products = await productCollection.find(query).toArray();
      res.json(products);
    });
    // Get Orders api
    app.get("/orders", verifyToken, async (req, res) => {
      // console.log(req.headers);
      const email = req.query.email;
      if (req.DecodedUserEmail === email) {
        const query = { email: email };

        const cursor = orderCollection.find(query);
        const result = await cursor.toArray();
        res.json(result);
      } else {
        res.status(401).json({ message: "User not authorized" });
      }
    });
    //  post method for orders
    app.post("/orders", async (req, res) => {
      const order = req.body;
      order.createdAt = new Date();
      const result = await orderCollection.insertOne(order);
      res.json(result);
    });
    //
  } finally {
    // client.close()
  }
}
run().catch(console.dir);
app.get("/", (req, res) => {
  console.log("Backend is running");
});

app.listen(port, () => {
  console.log("Listening port on: ", port);
});
