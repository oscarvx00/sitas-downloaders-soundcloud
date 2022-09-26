module.exports = {
    uploadFile,
    uploadFile2
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

async function uploadFile2(minioClient, name, stream, stat, metadata, bucket){
    try {
        const res = await minioClient.putObject(
            bucket,
            name,
            stream,
            stat.size,
            metadata
        )
        console.log(res)
    } catch (ex){
        console.error(`Error uploading file to minio ${ex}`)
        process.exit(1)
    }
}

