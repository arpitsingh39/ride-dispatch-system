const express = require("express");

const rideRoutes = require("./routes/rideRoutes");

const app = express();

app.use(express.json());

app.get("/", (req, res) => {
    res.json({
        message: "Ride Dispatch API is running"
    });
});

app.use(rideRoutes);

const PORT = 3000;

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});