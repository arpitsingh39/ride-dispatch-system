const { startConsumer } = require("../src/events/consumer");

startConsumer({
    name: "BILLING",
    queue: "billing.queue",

    handler: async (event) => {
        console.log(
            `[BILLING] charging rider for ride ${event.rideId}`
        );
    }
});