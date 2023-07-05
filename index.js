const express = require("express");
const app = express();
const cors = require("cors");
require("dotenv").config();
const mongoose = require("mongoose");
const bodyParser = require("body-parser");

mongoose.connect(process.env.MONGO_URI, {
  useUnifiedTopology: true,
  useNewUrlParser: true,
});
const { Schema } = mongoose;

const ExerciseSchema = new Schema({
  userId: { type: String, required: true },
  description: String,
  duration: Number,
  date: Date,
});

const UserSchema = new Schema({
  username: String,
});

const user = mongoose.model("User", UserSchema);
const exercise = mongoose.model("Exercise", ExerciseSchema);

app.use(bodyParser.urlencoded({ extended: false })); //
app.use(bodyParser.json());
app.use(cors());
app.use(express.static("public"));
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/views/index.html");
});

app.post("/api/users", (req, res) => {
  console.log("req.body", req.body);
  const newUser = new user({
    username: req.body.username,
  });
  newUser.save((err, data) => {
    if (!data || err) {
      res.send("There was an error saving the user");
    } else {
      res.json(data);
    }
  });
});

app.post("/api/users/:id/exercises", (req, res) => {
  const id = req.params.id;
  const { description, duration, date } = req.body;
  user.findById(id, (err, userData) => {
    if (err || !userData) {
      res.send("Couldn't find the user");
    } else {
      let newDate = new Date(date);
      if (date.toString().includes("Invalid")) {
        newDate = new Date();
      }
      const newExercise = new exercise({
        userId: id,
        description,
        duration,
        date: newDate,
      });
      newExercise.save((err, data) => {
        if (err || !data) {
          res.send("There was an error saving this exercise");
        } else {
          const { description, duration, date, _id } = data;
          res.json({
            _id: userData.id,
            username: userData.username,
            date: date.toDateString(),
            duration: Number(duration),
            description,
          });
        }
      });
    }
  });
});

app.get("/api/users/:id/logs/:", (req, res) => {
  const { from, to, limit } = req.query;
  const { id } = req.params;
  user.findById(id, (err, userData) => {
    if (err || !userData) {
      res.send("Could not find the user.");
    } else {
      let dateObj = {};
      if (from) {
        dateObj["$gte"] = new Date(from);
      }
      if (to) {
        dateObj["$lte"] = new Date(to);
      }
      let filter = {
        userId: id,
      };
      if (from || to) {
        filter.date = dateObj;
      }
      let nonNullLimit;
      if (limit === "null") {
        nonNullLimit = 500;
      }
      exercise
        .find(filter)
        .limit(+nonNullLimit)
        .exec((err, data) => {
          if (err || !data) {
            res.json([]);
          } else {
            const count = data.length;
            const rawLog = data;
            const { username, _id } = userData;
            const log = rawLog.map((l) => ({
              description: l.description,
              duration: l.duration,
              date: l.date.toDateString(),
            }));
            res.json({ _id, username, count, log });
          }
        });
    }
  });
});

//The GET request to /api/users returns an array.
app.get("/api/users", (req, res) => {
  user.find({}, (err, data) => {
    if (!data) {
      res.send("No users");
    } else {
      res.json(data);
    }
  });
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log("Your app is listening on port " + listener.address().port);
});
