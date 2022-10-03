const {describe, test, beforeAll, afterAll} = require('@jest/globals');
const fs = require('fs')

const MINIO_INTERNAL_ENDPOINT = process.env.MINIO_INTERNAL_ENDPOINT
const MINIO_INTERNAL_USER = process.env.MINIO_INTERNAL_USER
const MINIO_INTERNAL_PASS = process.env.MINIO_INTERNAL_PASS
const MINIO_INTERNAL_BUCKET = process.env.MINIO_INTERNAL_BUCKET


let minioClient


beforeAll(async () => {
    
    minioClient = new minio.Client({
        endPoint: MINIO_INTERNAL_ENDPOINT,
        accessKey: MINIO_INTERNAL_USER,
        secretKey: MINIO_INTERNAL_PASS
    })

})

test('test upload', async () => {
    //Prepare test
    fs.closeSync(fs.openSync('./testFile.txt', 'w'))
})