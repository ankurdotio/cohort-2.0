import "dotenv/config";
import express from "express";
import morgan from "morgan";
import mongoose from "mongoose";
import Redis from "ioredis";
import { User } from "./models/user.model.js";
import rateLimit from 'express-rate-limit';





// ---- MongoDB Connection ----
const connectToMongoDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected to MongoDB");
    } catch (error) {
        console.error("Error connecting to MongoDB:", error);
    }
};

connectToMongoDB();


// ---- Redis Connection ----
const redis = new Redis("redis://localhost:6379");

redis.once("ready", () => {
    console.log("Connected to Redis");
});


// ---- Express App Setup ----
const app = express();
app.use(morgan("dev"));
app.use(express.json());


// ---- ejs Template Engine Setup ----
app.set("view engine", "ejs");

app.set("views", "./views");

app.use(express.static("public"));

const globalLimiter = rateLimit({
    windowMs: 2 * 60 * 1000,  // 2 minutes
    max: 100,                    // 100 requests per window per IP
    message: {
        error: 'Too many requests. Please try again later.'
    },
    statusCode: 429,
    standardHeaders: true,   // sends RateLimit-* headers
});

// Apply to every route
app.use(globalLimiter);

// ---- Routes ----
app.get("/user/:id", async (req, res) => {
    try {

        const userFomCache = await redis.get(`user:${req.params.id}`);

        if (userFomCache) {
            return res.json({
                message: "User fetched from cache",
                data: JSON.parse(userFomCache)
            });
        }

        const user = await User.find();

        await redis.set(`user:${req.params.id}`, JSON.stringify(user), "EX", 60 * 60); // Cache for 1 hour

        res.json({
            message: "User fetched successfully",
            data: user
        });
    } catch (error) {
        res.status(500).json({ error: "Error fetching users" });
    }
});

app.post("/user", async (req, res) => {
    try {
        const newUser = new User(req.body);
        await newUser.save();
        res.json({
            message: "User created successfully",
            data: newUser
        });
    } catch (error) {
        res.status(500).json({ error: "Error creating user" });
    }
});

app.get("/", async (req, res) => {
    res.render("index", {
        username: "Building",
        bio: "Something about Building",
        profilePicture: "https://images.unsplash.com/photo-1779206746296-b7d3f467e55d?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxmZWF0dXJlZC1waG90b3MtZmVlZHw0OHx8fGVufDB8fHx8fA%3D%3D"
    });
});



// ---- Start Server ----
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
