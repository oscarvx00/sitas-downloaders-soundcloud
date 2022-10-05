const {describe, test, beforeAll, afterAll, expect} = require('@jest/globals');
const fs = require('fs')
const minio = require('minio');

const functions = require('./minio-manager')


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
        secretKey: MINIO_INTERNAL_PASS,
        useSSL: false
    })

})

test('test upload', async () => {
    //Prepare test
    fs.closeSync(fs.openSync('./testFile.txt', 'w'))

    //Do test
    await functions.uploadFile(
        minioClient,
        'testFile',
        './testFile.txt',
        {},
        MINIO_INTERNAL_BUCKET
    )

    //Check response
    let res
    try {
        res = await minioClient.statObject(
            MINIO_INTERNAL_BUCKET,
            'testFile')
    } catch(ex) {
        res = null
    }

    //Remove test data
    await minioClient.removeObject(
        MINIO_INTERNAL_BUCKET,
        'testFile'
    )

    fs.unlinkSync('./testFile.txt')

    expect(res?.size).toBe(0)
})