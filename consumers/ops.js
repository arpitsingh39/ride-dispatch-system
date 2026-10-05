process.on("message", (event) => {
    console.log(
        `[OPS] ride ${event.rideId} is now in status ${event.status}`
    );
});