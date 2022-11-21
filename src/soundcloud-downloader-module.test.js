const functions = require('./soundcloud-downloader-module')

const {expect, test, afterAll} = require('@jest/globals');
const fs = require('fs');
const { assert } = require('console');

const TEST_SONG_NAME = "Oliver Heldens - Gecko"
const TEST_SONG_URL = "https://soundcloud.com/oliverheldens/gecko-out-now"



test('search song ok', async () => {
    const data = await functions.searchSong(TEST_SONG_NAME)
    expect(data).toBe(TEST_SONG_URL)
})

test('search song not found', async () => {
    const data = await functions.searchSong("invalid_song_name_abcabcabcabcabc")
    expect(data).toBe(undefined)
})

test('Download song ok', async () => {
    await functions.downloadSong(TEST_SONG_URL, "1234")

    await functions.sleep(2000)

    const fileExists = fs.existsSync(`1234.mp3`)
    try{
        fs.unlinkSync("1234.mp3")
    } catch {}

    expect(fileExists).toBe(true)
})

test('Download song 404', async () => {
    await functions.downloadSong("https://soundcloud.com/oliverheldens/invalid_url", "1234")

    await functions.sleep(2000)

    const fileExists = fs.existsSync(`1234.mp3`)
    try{
        fs.unlinkSync("1234.mp3")
    } catch {}

    expect(fileExists).toBe(false)
})


//TODO: Create resend request tests