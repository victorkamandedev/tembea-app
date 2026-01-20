import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config({ path: "./.env" });

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;

// 🔌 Connect to MongoDB
mongoose
  .connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

// 🧠 Route schema (with all needed fields)
const RouteSchema = new mongoose.Schema({
  name: String,
  geometry: Object, // GeoJSON LineString
  start: Object,    // { lat, lng }
  end: Object,      // { lat, lng }
  distance: Number, // in meters
  duration: Number, // in minutes
  createdAt: { type: Date, default: Date.now },
});

const Route = mongoose.model("Route", RouteSchema);

// 🔥 Test endpoint
app.get("/test", (req, res) => res.json({ success: true }));

// ✅ Save route
app.post("/routes", async (req, res) => {
  try {
    const route = await Route.create(req.body);
    res.status(201).json(route);
  } catch (err) {
    console.error("Error saving route:", err);
    res.status(500).json({ error: err.message });
  }
});

// 📥 Get all routes
app.get("/routes", async (req, res) => {
  try {
    const routes = await Route.find().sort({ createdAt: -1 }); // newest first
    res.json(routes);
  } catch (err) {
    console.error("Error fetching routes:", err);
    res.status(500).json({ error: err.message });
  }
});

// ❌ Delete route
app.delete("/routes/:id", async (req, res) => {
  try {
    await Route.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    console.error("Error deleting route:", err);
    res.status(500).json({ error: err.message });
  }
});

// 🚀 Start server
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
