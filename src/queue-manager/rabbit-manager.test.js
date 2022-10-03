const { describe, test, beforeAll, afterAll, expect } = require('@jest/globals');
const amqp = require('amqplib');

const rabbitManager = require('./rabbit-manager')


const RABBITMQ_ENDPOINT = process.env.RABBITMQ_ENDPOINT
const DOWNLOAD_REQUEST_EXCHANGE = "mtest-exchange"
const DOWNLOAD_REQUEST_SOUNDCLOUD_QUEUE = "mtest-queue"
const DOWNLOAD_COMPLETED_EXCHANGE = "mtest-exchange-2"


let rabbitConn = undefined
let rabbitChannel = undefined


beforeAll(async () => {
    rabbitConn = await amqp.connect(RABBITMQ_ENDPOINT)
    rabbitChannel = await rabbitConn.createChannel()

    await rabbitManager.initRabbit(
        rabbitChannel,
        DOWNLOAD_REQUEST_EXCHANGE,
        DOWNLOAD_REQUEST_SOUNDCLOUD_QUEUE,
        DOWNLOAD_COMPLETED_EXCHANGE
    )
})

test('send message', async () => {
    //Prepare test
    const msg = { payload: "msg" }

    //Do action
    await rabbitManager.sendMessage(
        rabbitChannel,
        DOWNLOAD_REQUEST_EXCHANGE,
        'soundcloud',
        msg)

    //As we dont test with a callback, wait n time and get message
    await new Promise(r => setTimeout(r, 2000))
    const resMsg = await rabbitChannel.get(
        DOWNLOAD_REQUEST_SOUNDCLOUD_QUEUE
    )

    expect(JSON.parse(resMsg?.content?.toString())?.payload).toBe("msg")
})

afterAll(async () => {
    await rabbitChannel.close()
})