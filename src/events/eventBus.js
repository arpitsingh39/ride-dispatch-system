const amqp = require("amqplib");
const { URL, EXCHANGE } = require("./config");

let channel = null;

async function initEventBus() {
    const connection = await amqp.connect(URL);

    connection.on("error", (err) =>
        console.error("[BUS] connection error:", err.message)
    );

    connection.on("close", () => {
        console.error("[BUS] connection closed");
        channel = null;
    });

    channel = await connection.createConfirmChannel();

    await channel.assertExchange(EXCHANGE, "topic", {
        durable: true
    });

    console.log("[BUS] connected to RabbitMQ");
}

function publishRideEvent(ride) {
    const event = {
        rideId: ride.rideId,
        status: ride.status,
        assignedDriver: ride.assignedDriver
    };

    if (!channel) {
        console.error(
            `[BUS] not connected, dropping event for ${event.rideId}`
        );
        return;
    }

    channel.publish(
        EXCHANGE,
        `ride.${event.status}`,
        Buffer.from(JSON.stringify(event)),
        {
            persistent: true,
            contentType: "application/json",
            messageId: `${event.rideId}:${event.status}`
        },
        (err) => {
            if (err) {
                console.error(
                    `[BUS] publish failed for ${event.rideId}:`,
                    err.message
                );
            }
        }
    );
}

module.exports = {
    initEventBus,
    publishRideEvent
};