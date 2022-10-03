module.exports = {
    uploadFile,
}

async function uploadFile(minioClient, name, filepath, metadata, bucket){

    try {
        await minioClient.fPutObject(
            bucket,
            name,
            filepath,
            metadata
        )
    } catch (ex){
        console.error(`Error uploading file to minio ${ex}`)
        process.exit(1)
    }

}