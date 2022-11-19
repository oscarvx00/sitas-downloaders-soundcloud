const { ServiceBusClient } = require("@azure/service-bus");

module.exports = {
    initAzureServiceBusClient,
    sendMessage
}

function initAzureServiceBusClient(connectionString){
    return new ServiceBusClient(connectionString)
}

async function sendMessage(sbClient,message, queue){
    
    const sender = sbClient.createSender(queue)

    await sender.sendMessages([{
        body: message
    }])

    await sender.close()

}
