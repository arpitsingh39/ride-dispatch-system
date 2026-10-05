const rides = new Map();

function createRide() {
    const rideId = `ride-${rides.size + 1}`;

    const ride = {
        rideId,
        status: "REQUESTED",
        assignedDriver: null,
        assignmentHistory: [],
        rejectionCount: 0,
        nextDriverIndex: 0
    };

    rides.set(rideId, ride);

    return ride;
}

function getRide(rideId) {
    return rides.get(rideId);
}

function getAllRides() {
    return Array.from(rides.values());
}

module.exports = {
    createRide,
    getRide,
    getAllRides
};