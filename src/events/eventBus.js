const { fork } = require("child_process");
const path = require("path");

const billingProcess = fork(
    path.join(__dirname, "../../consumers/billing.js")
);

const opsProcess = fork(
    path.join(__dirname, "../../consumers/ops.js")
);

function publishRideEvent(ride) {
    const event = {
        rideId: ride.rideId,
        status: ride.status,
        assignedDriver: ride.assignedDriver
    };

    // Send the SAME event to both programs
    billingProcess.send(event);
    opsProcess.send(event);
}

module.exports = {
    publishRideEvent
};