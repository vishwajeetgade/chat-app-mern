import dotenv from "dotenv";
import express from "express";
import mongoose from "mongoose";
import User from "./models/User.js";
import Message from "./models/Message.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import cors from "cors";
import bodyParser from "body-parser";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import { WebSocketServer } from "ws";

/* UNCAUGHT EXCEPTION HANDLER */
process.on("uncaughtException", (err) => {
  console.log(`Error: ${err.message}`);
  console.log(`Shutting down the server due to uncaughtException`);
  process.exit(1);
});

dotenv.config();
const app = express();
app.use(morgan("common"));
app.use(express.json());
app.use(cookieParser());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cors({ credentials: true, origin: "http://localhost:5173" }));

app.get("/api/v1/test", (req, res) => {
  res.json("test ok");
});

async function getUserDataFromRequest(req) {
  return new Promise((resolve, reject) => {
    const token = req.cookies?.token;
    if (token) {
      jwt.verify(token, process.env.JWT_SECRET, {}, (err, userData) => {
        if (err) throw err;
        resolve(userData);
      });
    } else {
      reject("no token found");
    }
  });
}

app.post("/api/v1/register", async (req, res) => {
  try {
    const salt = await bcrypt.genSalt();
    const passwordHash = await bcrypt.hash(req.body.password, salt);

    const newUser = new User({
      username: req.body.username,
      password: passwordHash,
    });

    const savedUser = await newUser.save();

    const token = jwt.sign(
      { userId: savedUser._id, username: savedUser.username },
      process.env.JWT_SECRET
    );

    return res
      .cookie("token", token)
      .status(201)
      .json({
        data: {
          userId: savedUser._id,
          username: savedUser.username,
        },
        message: "User Register Successfully",
        success: true,
      });
  } catch (err) {
    return res.status(400).json({
      error: err,
      succes: false,
    });
  }
});

app.post("/api/v1/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    const user = await User.findOne({ username });
    if (!user) {
      return res.status(404).json({
        status: "failed",
        error: "User does not exist.",
        success: false,
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        error: "Invalid credentials",
        success: false,
      });
    }

    const token = jwt.sign(
      { userId: user._id, username: user.username },
      process.env.JWT_SECRET
    );

    return res
      .cookie("token", token)
      .status(201)
      .json({
        data: {
          userId: user._id,
          username: user.username,
        },
        message: "User Login Successfully",
        success: true,
      });
  } catch (err) {
    return res.status(400).json({
      error: err,
      succes: false,
    });
  }
});

app.get("/api/v1/logout", async (req, res) => {
  try {
    return res.cookie("token", "").status(200).json({
      data: [],
      message: "User Logout Successfully",
      success: true,
    });
  } catch (err) {
    return res.status(400).json({
      error: err,
      succes: false,
    });
  }
});

app.get("/api/v1/profile", async (req, res) => {
  try {
    const token = req.cookies?.token;
    if (token) {
      jwt.verify(token, process.env.JWT_SECRET, {}, (err, userData) => {
        if (err) throw err;
        return res.status(200).json({
          data: userData,
          success: true,
        });
      });
    } else {
      return res.status(401).json({
        error: "Token not found",
        succes: false,
      });
    }
  } catch (err) {
    return res.status(400).json({
      error: err,
      succes: false,
    });
  }
});

app.get("/api/v1/messages/:recipientId", async (req, res) => {
  try {
    const { recipientId } = req.params;
    const userData = await getUserDataFromRequest(req);
    const userId = userData.userId;
    const messages = await Message.find({
      sender: { $in: [userId, recipientId] },
      recipient: { $in: [userId, recipientId] },
    }).sort({ createdAt: 1 });
    return res.status(200).json({
      data: messages,
      success: true,
    });
  } catch (err) {
    return res.status(400).json({
      error: err,
      succes: false,
    });
  }
});

app.get("/api/v1/people", async (req, res) => {
  try {
    const users = await User.find({}, { password: 0 });
    return res.status(200).json({
      data: users,
      success: true,
    });
  } catch (err) {
    return res.status(400).json({
      error: err,
      succes: false,
    });
  }
});

const PORT = process.env.PORT || 8001;
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    const server = app.listen(PORT, () => {
      console.log(`Server is running on PORT - ${PORT}`);
    });

    /* Websocket Server */
    const wss = new WebSocketServer({ server });
    wss.on("connection", (response, request) => {
      // Read username and userId from Cookie
      const cookies = request.headers.cookie;
      if (cookies) {
        const tokenCookieString = cookies
          .split(";")
          .find((str) => str.startsWith("token="));
        if (tokenCookieString) {
          const token = tokenCookieString.split("=")[1];
          if (token) {
            jwt.verify(token, process.env.JWT_SECRET, {}, (err, userData) => {
              if (err) throw err;
              const { userId, username } = userData;
              response.userId = userId;
              response.username = username;
            });
          }
        }
      }

      response.on("message", async (msg) => {
        const messageData = JSON.parse(msg.toString());
        const { recipient, text } = messageData;
        if (recipient && text) {
          const newMessage = new Message({
            text,
            sender: response.userId,
            recipient,
          });
          const messageDoc = await newMessage.save();

          [...wss.clients]
            .filter((c) => c.userId === recipient)
            .forEach((c) =>
              c.send(
                JSON.stringify({
                  text,
                  sender: response.userId,
                  recipient,
                  _id: messageDoc._id,
                })
              )
            );
        }
      });

      // notify everyone when someone is online
      [...wss.clients].forEach((client) => {
        client.send(
          JSON.stringify({
            online: [...wss.clients].map((c) => ({
              userId: c.userId,
              username: c.username,
            })),
          })
        );
      });
    });
  })
  .catch((err) => {
    console.log(err);
    process.exit(1);
  });
