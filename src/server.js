const express = require("express");
const rideRoutes = require("./routes/rideRoutes");
const { initEventBus } = require("./events/eventBus");

const app = express();

app.use(express.json());

app.get("/", (req, res) => {
    res.json({ message: "Ride Dispatch API is running" });
});

app.use(rideRoutes);

initEventBus()
    .then(() => {
        app.listen(3000, () => {
            console.log("Server running on http://localhost:3000");
        });
    })
    .catch((err) => {
        console.error(
            "Failed to connect to RabbitMQ:",
            err.message
        );
        process.exit(1);
    });