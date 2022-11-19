const { describe, test, beforeAll, afterAll, expect } = require('@jest/globals');

const AZURE_SERVICE_BUS_DOWNLOAD_REQUEST_SOUNDCLOUD_QUEUE = 'download-request-soundcloud-test'
const AZURE_SERVICE_BUS_CONNECTION_STRING = process.env.AZURE_SERVICE_BUS_CONNECTION_STRING


const azureServiceBusManager = require("./azure-service-bus-manager")


let azureServiceBusClient = undefined

beforeAll(async () => {
    azureServiceBusClient = azureServiceBusManager.initAzureServiceBusClient(AZURE_SERVICE_BUS_CONNECTION_STRING)
})

test('send message', async() => {
    const msg = {
        payload: "dummy_payload"
    }

    let res = undefined

    await azureServiceBusManager.sendMessage(
        azureServiceBusClient,
        msg,
        AZURE_SERVICE_BUS_DOWNLOAD_REQUEST_SOUNDCLOUD_QUEUE
    )

    const consumeMessage = (message) => {
        res = message.body
    }
    const processError = (error) => {
        throw new Error(error)
    }

    const receiver = azureServiceBusClient.createReceiver(AZURE_SERVICE_BUS_DOWNLOAD_REQUEST_SOUNDCLOUD_QUEUE)
    receiver.subscribe({
        processMessage: consumeMessage,
        processError: processError
    })

    await new Promise(r => setTimeout(r, 3000))

    expect(res.payload).toBe("dummy_payload")
})