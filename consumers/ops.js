const { startConsumer } = require("../src/events/consumer");

startConsumer({
    name: "OPS",
    queue: "ops.queue",

    handler: async (event) => {
        console.log(
            `[OPS] ride ${event.rideId} is now in status ${event.status}`
        );
    }
});