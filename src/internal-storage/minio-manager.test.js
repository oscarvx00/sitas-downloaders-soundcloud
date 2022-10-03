const {describe, test, beforeAll, afterAll, expect} = require('@jest/globals');
const fs = require('fs')
const minio = require('minio');


const MINIO_INTERNAL_ENDPOINT = process.env.MINIO_INTERNAL_ENDPOINT
const MINIO_INTERNAL_USER = process.env.MINIO_INTERNAL_USER
const MINIO_INTERNAL_PASS = process.env.MINIO_INTERNAL_PASS
const MINIO_INTERNAL_BUCKET = process.env.MINIO_INTERNAL_BUCKET
const MINIO_INTERNAL_PORT = Number(process.env.MINIO_INTERNAL_PORT)


let minioClient


beforeAll(async () => {
    
    minioClient = new minio.Client({
        endPoint: MINIO_INTERNAL_ENDPOINT,
        port: MINIO_INTERNAL_PORT,
        accessKey: MINIO_INTERNAL_USER,
        secretKey: MINIO_INTERNAL_PASS
    })

})

test('test upload', async () => {
    //Prepare test
    fs.closeSync(fs.openSync('./testFile.txt', 'w'))

    expect(1).toBe(1)
})