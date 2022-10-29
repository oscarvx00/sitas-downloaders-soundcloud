const amqp = require('amqplib');
const minio = require('minio')
const scdl = require('soundcloud-downloader').default
const axios = require('axios')
const fs = require('fs')
const {randomInt} = require('crypto')

const rabbitManager = require("./queue-manager/rabbit-manager")
const minioManager = require("./internal-storage/minio-manager");




const RABBITMQ_ENDPOINT = process.env.RABBITMQ_ENDPOINT
const DOWNLOAD_REQUEST_EXCHANGE = process.env.DOWNLOAD_REQUEST_EXCHANGE
const DOWNLOAD_REQUEST_SOUNDCLOUD_QUEUE = process.env.DOWNLOAD_REQUEST_SOUNDCLOUD_QUEUE
const DOWNLOAD_COMPLETED_EXCHANGE = process.env.DOWNLOAD_COMPLETED_EXCHANGE

const MINIO_INTERNAL_ENDPOINT = process.env.MINIO_INTERNAL_ENDPOINT
const MINIO_INTERNAL_PORT = Number(process.env.MINIO_INTERNAL_PORT)
const MINIO_INTERNAL_USER = process.env.MINIO_INTERNAL_USER
const MINIO_INTERNAL_PASS = process.env.MINIO_INTERNAL_PASS
const MINIO_INTERNAL_BUCKET = process.env.MINIO_INTERNAL_BUCKET

const SOUNDCLOUD_CLIENT_ID = process.env.SOUNDCLOUD_CLIENT_ID

const OTHER_DOWNLOAD_MODULES = ["spotify", "youtube"]


let minioClient
let rabbitConn
let rabbitChannel


async function soundcloudModule() {

    try {
        minioClient = new minio.Client({
            endPoint: MINIO_INTERNAL_ENDPOINT,
            port: MINIO_INTERNAL_PORT,
            accessKey: MINIO_INTERNAL_USER,
            secretKey: MINIO_INTERNAL_PASS,
            useSSL: false
        })

    } catch (ex) {
        console.error(`Error connecting minio: ${ex}`)
        process.exit(1)
    }

    try {
        rabbitConn = await amqp.connect(RABBITMQ_ENDPOINT)
        rabbitChannel = await rabbitConn.createChannel()
        await rabbitManager.initRabbit(
            rabbitChannel,
            DOWNLOAD_REQUEST_EXCHANGE,
            DOWNLOAD_REQUEST_SOUNDCLOUD_QUEUE,
            DOWNLOAD_COMPLETED_EXCHANGE
        )

        rabbitChannel.consume(DOWNLOAD_REQUEST_SOUNDCLOUD_QUEUE, consumeDownloadRequest, {noAck: true})

    } catch (ex) {
        console.error(`Error connecting to rabbit: ${ex}`)
        process.exit(1)
    }

}

async function consumeDownloadRequest(msg) {
    try {
        let downloadRequest = JSON.parse(msg.content)

        let url = downloadRequest.songName
        if (!downloadRequest.direct) {
            const urlSearch = await searchSong(downloadRequest.songName)
            if (urlSearch == undefined) {
                await resendRequest(downloadRequest)
                return
            }
            url = urlSearch
        }
        console.log(`Downloading ${url}...`)
        const downloadSongResponse = await downloadSong(url, downloadRequest.downloadId)
        await sleep(3000)
        console.log(`Downloaded ${url}...`)
        switch (downloadSongResponse) {
            case "Not found":
            case "Error":
                await resendRequest(downloadRequest)
                break
            case "OK":
                //Save song in internal storage
                await minioManager.uploadFile(
                    minioClient,
                    `${downloadRequest.downloadId}.mp3`,
                    `${downloadRequest.downloadId}.mp3`,
                    {
                        //'Content-Type': 
                    },
                    MINIO_INTERNAL_BUCKET
                )
                //Remove file from fs
                fs.unlinkSync(`${downloadRequest.downloadId}.mp3`)
                //Send download completed message
                await rabbitManager.sendMessage(
                    rabbitChannel,
                    DOWNLOAD_COMPLETED_EXCHANGE,
                    '',
                    {
                        downloadId: downloadRequest.downloadId,
                        status: 'OK'
                    })
                break
        }

    } catch (ex) {
        console.log(`Error processing download request`)
    }
}

soundcloudModule()


module.exports = {
    downloadSong,
    searchSong,
    sleep
}


async function downloadSong(url, downloadId) {
    try {
        let res = await scdl.download(url)
        if (res?.response?.status == 404) {
            return "Not found"
        } else {
            await res.pipe(await fs.createWriteStream(`${downloadId}.mp3`))
            return "OK"
        }
    } catch (ex) {
        console.log(`Error downloading ${url}: ${ex}`)
        return "Error"
    }
}

async function searchSong(name) {
    try {
        const url = `https://api-v2.soundcloud.com/search?&client_id=${SOUNDCLOUD_CLIENT_ID}&q=${encodeURI(name)}`
        const res = await axios.get(url)
        if (res.status >= 400) {
            //Return same response as it is not found if there is an error
            console.log(`Error API searching ${name}: ${res.status}`)
            return undefined
        }
        return res.data.collection.find(it => it.kind == "track").permalink_url
    } catch (ex) {
        //Return same response as it is not found if there is an error
        console.log(`Error searching ${name}: ${ex}`)
        return undefined
    }
}

async function resendRequest(downloadRequest) {

    if (!OTHER_DOWNLOAD_MODULES.filter(it => downloadRequest[it]).length) {
        //Send download completed error
        await rabbitManager.sendMessage(
            rabbitChannel,
            '',
            DOWNLOAD_COMPLETED_EXCHANGE,
            {
                downloadId: downloadRequest.downloadId,
                status: 'Error'
            })
    } else {
        //Deactivate soundcloud module
        downloadRequest.soundcloud = false

        //Select module random
        const availableModules = OTHER_DOWNLOAD_MODULES.filter(it => downloadRequest[it])
        const selectedModule = availableModules[randomInt(0,availableModules.length - 1)]

        //Send download request
        await rabbitManager.sendMessage(
            rabbitChannel,
            DOWNLOAD_REQUEST_EXCHANGE,
            downloadRequest,
            selectedModule)
    }
}

function sleep(ms) {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  }