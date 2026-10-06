const amqp = require("amqplib");
const { URL, EXCHANGE } = require("./config");

async function startConsumer({
    name,
    queue,
    bindingKey = "ride.#",
    handler
}) {
    const connection = await amqp.connect(URL);
    const channel = await connection.createChannel();

    await channel.assertExchange(EXCHANGE, "topic", {
        durable: true
    });

    await channel.assertQueue(queue, {
        durable: true
    });

    await channel.bindQueue(
        queue,
        EXCHANGE,
        bindingKey
    );

    channel.prefetch(10);

    const processed = new Set();

    channel.consume(queue, async (msg) => {
        if (!msg) return;

        const id = msg.properties.messageId;

        try {
            if (!processed.has(id)) {
                await handler(
                    JSON.parse(msg.content.toString())
                );

                processed.add(id);
            }

            channel.ack(msg);

        } catch (err) {
            console.error(
                `[${name}] handler failed:`,
                err.message
            );

            channel.nack(msg, false, false);
        }
    });

    console.log(
        `[${name}] waiting for events on ${queue}`
    );
}

module.exports = {
    startConsumer
};