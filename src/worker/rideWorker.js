const {
    getRide
} = require("../store/rideStore");

const {
    publishRideEvent
} = require("../events/eventBus");

const drivers = [
    "Driver-1",
    "Driver-2",
    "Driver-3",
    "Driver-4",
    "Driver-5",
    "Driver-6",
    "Driver-7",
    "Driver-8",
    "Driver-9",
    "Driver-10"
];

function randomDriverResponse() {
    return Math.random() < 0.5;
}

async function processRide(ride) {
    console.log(`\nProcessing ${ride.rideId}`);

    while (
        ride.rejectionCount < 3 &&
        ride.nextDriverIndex < drivers.length
    ) {
        const driver = drivers[ride.nextDriverIndex];

        ride.nextDriverIndex++;

        console.log(`${ride.rideId} → offering to ${driver}`);

        const accepted = randomDriverResponse();

        if (accepted) {
            ride.assignmentHistory.push(driver);

            ride.assignedDriver = driver;
            ride.status = "ASSIGNED";

            console.log(
                `${ride.rideId} → ${driver} ACCEPTED`
            );

            publishRideEvent(ride);

            return;
        }

        ride.rejectionCount++;

        console.log(
            `${ride.rideId} → ${driver} REJECTED`
        );
    }

    ride.status = "NO_DRIVER_FOUND";

    console.log(
        `${ride.rideId} → NO_DRIVER_FOUND`
    );

    publishRideEvent(ride);
}

module.exports = {
    processRide
};