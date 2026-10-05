const TOTAL_RIDES = 100;

async function createRides() {
    const requests = [];

    for (let i = 0; i < TOTAL_RIDES; i++) {
        requests.push(
            fetch("http://localhost:3000/rides", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                }
            })
        );
    }

    const responses = await Promise.all(requests);

    const rides = await Promise.all(
        responses.map(response => response.json())
    );

    console.log(`Created ${rides.length} rides`);

    return rides.map(ride => ride.rideId);
}

async function getRides() {
    const response = await fetch("http://localhost:3000/rides");
    const data = await response.json();

    return data.rides;
}

async function waitForCompletion(rideIds) {
    const rideIdSet = new Set(rideIds);

    while (true) {
        const allRides = await getRides();

        // Only look at rides created by THIS test
        const testRides = allRides.filter(
            ride => rideIdSet.has(ride.rideId)
        );

        const completed = testRides.filter(
            ride =>
                ride.status === "ASSIGNED" ||
                ride.status === "NO_DRIVER_FOUND"
        );

        console.log(
            `Progress: ${completed.length}/${TOTAL_RIDES} completed`
        );

        if (completed.length === TOTAL_RIDES) {
            return testRides;
        }

        await new Promise(resolve => setTimeout(resolve, 500));
    }
}

async function runTest() {
    console.log("\nStarting 100-ride test...\n");

    // Create exactly 100 rides and remember their IDs
    const rideIds = await createRides();

    // Wait only for those 100 rides
    const rides = await waitForCompletion(rideIds);

    const assigned = rides.filter(
        ride => ride.status === "ASSIGNED"
    );

    const noDriverFound = rides.filter(
        ride => ride.status === "NO_DRIVER_FOUND"
    );

    const finalRides = rides.filter(
        ride =>
            ride.status === "ASSIGNED" ||
            ride.status === "NO_DRIVER_FOUND"
    );

    const stuckRides = rides.filter(
        ride =>
            ride.status !== "ASSIGNED" &&
            ride.status !== "NO_DRIVER_FOUND"
    );

    const duplicateAssignments = rides.filter(
        ride => ride.assignmentHistory.length > 1
    ).length;

    console.log("\n==============================");
    console.log("       TEST RESULTS");
    console.log("==============================");

    console.log(`Total rides created: ${rides.length}`);
    console.log(`ASSIGNED: ${assigned.length}`);
    console.log(`NO_DRIVER_FOUND: ${noDriverFound.length}`);
    console.log(`Final rides: ${finalRides.length}`);

    console.log(
        `Any ride assigned to 2 drivers? ${duplicateAssignments}`
    );

    console.log(
        `Any ride stuck with no final status? ${stuckRides.length}`
    );

    console.log("==============================\n");
}

runTest().catch(error => {
    console.error("Test failed:", error);
});