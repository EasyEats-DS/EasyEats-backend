const config = {
    kafka: {
        clientId: 'notification-service-local',
        brokers: ['localhost:9092'],
        groupId: 'notification-service-group-local'
    },
    mongodb: {
        uri: 'mongodb+srv://madhawaawishka:madhawaawishka@cluster0.ixf1ahz.mongodb.net/EasyEatsDB_notifications?retryWrites=true&w=majority'
    },
    service: {
        port: 5005
    }
};

module.exports = config;