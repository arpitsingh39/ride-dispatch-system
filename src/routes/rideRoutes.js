const express = require("express");

const router = express.Router();

const {
    createRide,
    getAllRides
} = require("../store/rideStore");

const {
    addRide
} = require("../queue/rideQueue");

const {
    publishRideEvent
} = require("../events/eventBus");

router.post("/rides", (req, res) => {
    const ride = createRide();

    // Status starts as REQUESTED
    publishRideEvent(ride);

    // Process asynchronously
    addRide(ride);

    // Return immediately
    res.status(201).json({
        rideId: ride.rideId
    });
});

router.get("/rides", (req, res) => {
    res.json({
        rides: getAllRides()
    });
});

module.exports = router;