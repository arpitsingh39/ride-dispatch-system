const queue = [];

let processing = false;

function addRide(ride) {
    queue.push(ride);
    processQueue();
}

function processQueue() {
    if (processing || queue.length === 0) {
        return;
    }

    processing = true;

    const ride = queue.shift();

    // Import here to avoid circular dependency problems
    const { processRide } = require("../worker/rideWorker");

    processRide(ride)
        .catch(error => {
            console.error("Error processing ride:", error);
        })
        .finally(() => {
            processing = false;
            processQueue();
        });
}

module.exports = {
    addRide
};