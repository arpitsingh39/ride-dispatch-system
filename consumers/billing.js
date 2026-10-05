process.on("message", (event) => {
    console.log(
        `[BILLING] charging rider for ride ${event.rideId}`
    );
});