const amqp = require('amqplib');
const minio = require('minio')
const scdl = require('soundcloud-downloader').default
const axios = require('axios')
const fs = require('fs')
const {randomInt} = require('crypto')

const minioManager = require("./internal-storage/minio-manager");
const azureServiceBusManager = require("./queue-manager/azure-service-bus-manager")


const MINIO_INTERNAL_ENDPOINT = process.env.MINIO_INTERNAL_ENDPOINT
const MINIO_INTERNAL_PORT = Number(process.env.MINIO_INTERNAL_PORT)
const MINIO_INTERNAL_USER = process.env.MINIO_INTERNAL_USER
const MINIO_INTERNAL_PASS = process.env.MINIO_INTERNAL_PASS
const MINIO_INTERNAL_BUCKET = process.env.MINIO_INTERNAL_BUCKET

const SOUNDCLOUD_CLIENT_ID = process.env.SOUNDCLOUD_CLIENT_ID

const AZURE_SERVICE_BUS_CONNECTION_STRING = process.env.AZURE_SERVICE_BUS_CONNECTION_STRING
const AZURE_SERVICE_BUS_DOWNLOAD_REQUEST_SOUNDCLOUD_QUEUE = process.env.AZURE_SERVICE_BUS_DOWNLOAD_REQUEST_SOUNDCLOUD_QUEUE
const AZURE_SERVICE_BUS_DOWNLOAD_REQUEST_QUEUE = process.env.AZURE_SERVICE_BUS_DOWNLOAD_REQUEST_QUEUE
const AZURE_SERVICE_BUS_DOWNLOAD_COMPLETED_QUEUE = process.env.AZURE_SERVICE_BUS_DOWNLOAD_COMPLETED_QUEUE


let minioClient
let azureServiceBusClient


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

    try{
        azureServiceBusClient = azureServiceBusManager.initAzureServiceBusClient(AZURE_SERVICE_BUS_CONNECTION_STRING)
        

        const receiver = azureServiceBusClient.createReceiver(AZURE_SERVICE_BUS_DOWNLOAD_REQUEST_SOUNDCLOUD_QUEUE)
        receiver.subscribe({
            processMessage: consumeDownloadRequest,
            processError: azureServiceBusErrorHandler
        })

    } catch(ex){
        console.error(`Error connecing to Azure Service Bus: ${ex}`)
        process.exit(1)
    }

    console.log("Init completed, listening messages")

}

async function azureServiceBusErrorHandler(error){
    console.error(`Azure service bus error: ${error}`)
}

async function consumeDownloadRequest(msg) {
    try {
        console.log(msg.body)
        let downloadRequest = msg.body
        //let downloadRequest = msg.body.toString()
        let url = downloadRequest.songName
        if (!downloadRequest.direct) {
            console.log(downloadRequest.songName)
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
                //Get song name
                const downloadName = await getSongName(url)
                if(downloadName == undefined){
                    break;
                }
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
                    
                await azureServiceBusManager.sendMessage(
                    azureServiceBusClient,
                    {
                        downloadId: downloadRequest.downloadId,
                        status: 'OK',
                        downloadName: downloadName
                    },
                    AZURE_SERVICE_BUS_DOWNLOAD_COMPLETED_QUEUE
                )
                break
        }

    } catch (ex) {
        console.log(`Error processing download request: ${ex}`)
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

    downloadRequest.soundcloud = false

    if(downloadRequest.soundcloud || downloadRequest.spotify){
        await azureServiceBusManager.sendMessage(
            azureServiceBusClient,
            downloadRequest,
            AZURE_SERVICE_BUS_DOWNLOAD_REQUEST_QUEUE
        )
    } else {
        await azureServiceBusManager.sendMessage(
            azureServiceBusClient,
            {
                downloadId: downloadRequest.downloadId,
                status: 'Error',
            },
            AZURE_SERVICE_BUS_DOWNLOAD_COMPLETED_QUEUE
        )
    }
    
}

function sleep(ms) {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  }

async function getSongName(url){
    const searchStr = url.split('/')[url.split('/').length - 1]

    try {
        const url = `https://api-v2.soundcloud.com/search?&client_id=${SOUNDCLOUD_CLIENT_ID}&q=${encodeURI(searchStr)}`
        const res = await axios.get(url)
        if (res.status >= 400) {
            //Return same response as it is not found if there is an error
            console.log(`Error API searching name ${url}: ${res.status}`)
            return undefined
        }
        console.log(res.data.collection.find(it => it.kind == 'track').title)
        const username = res.data.collection.find(it => it.kind == "track").user.username
        const title = res.data.collection.find(it => it.kind == "track").title
        return `${username} - ${title}`
    } catch (ex) {
        //Return same response as it is not found if there is an error
        console.log(`Error searching name ${url}: ${ex}`)
        return undefined
    }
}