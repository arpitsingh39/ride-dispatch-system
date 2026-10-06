module.exports = {
    URL: process.env.RABBITMQ_URL || "amqp://localhost",
    EXCHANGE: "ride.events"
};