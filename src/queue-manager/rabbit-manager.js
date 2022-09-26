

module.exports = {
    initRabbit,
    sendMessage
}


async function initRabbit(channel, DOWNLOAD_REQUEST_EXCHANGE, DOWNLOAD_REQUEST_SOUNDCLOUD_QUEUE, DOWNLOAD_COMPLETED_EXCHANGE) {

    try {
        //const channel = await rabbitConn.createChannel()

        //Init DownloadRequest exchange if not exists
        await channel.assertExchange(DOWNLOAD_REQUEST_EXCHANGE, 'direct', {
            durable: false
        })

        //Init DownloadRequest soundcloud queue
        await channel.assertQueue(DOWNLOAD_REQUEST_SOUNDCLOUD_QUEUE, {
            exclusive: true,
            autoAck : true,
            durable: false
        })

        //Bind queue to exchange with souting key 'soundcloud'
        await channel.bindQueue(DOWNLOAD_REQUEST_SOUNDCLOUD_QUEUE, DOWNLOAD_REQUEST_EXCHANGE, 'soundcloud')

        //TODO: Need to declare DownloadComplete exchange??

        return channel
    } catch (ex) {
        console.error(ex)
        process.exit(1)
    }
}

async function sendMessage(channel, exchange, key, msg){
    try{
        await channel.publish(exchange, key, Buffer.from(JSON.stringify(msg)))
    } catch (ex){
        console.error(ex)
        process.exit(1)
    }
}