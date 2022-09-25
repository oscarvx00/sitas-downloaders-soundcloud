const functions = require('./soundcloud-downloader-module')

const {expect, test} = require('@jest/globals');


test('search song ok', async () => {
    const data = await functions.searchSong("drumcode 50")
    expect(data).toBe("https://soundcloud.com/drumcode/rebuke-rattle-drumcode-dc212")
})