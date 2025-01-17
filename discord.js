const { Client } = require('discord.js');
const { token } = require('./token.json');
const { prefix } = require('./config.json');
const request = require('request');
const client = new Client();
const http = require("http")


class Music {

    constructor() {
        this.isPlaying = false;
        this.queue = {};
        this.connection = {};
        this.dispatcher = {};
    }

    async join(msg) {

        // Bot 加入語音頻道
        // this.connection[msg.guild.id] = await msg.member.voice.channel.join();
        // console.log("3\n")

        if (msg.member.voice.channel) {
            this.connection = await msg.member.voice.channel.join();
          } else {
            msg.reply('請先加入頻道!');
          }

    }

    play(msg) {

        // 語音群的 ID
        const guildID = msg.guild.id;

        // 如果 Bot 還沒加入該語音群的語音頻道
        if (!this.connection[guildID]) {
            msg.channel.send('請先加入頻道');
            console.log("5\n")
            return;
        }

        // 處理字串，將 !play 字串拿掉，只留下关键字
        const keys = msg.content.replace(`${prefix}play `, '');

        // 取得名稱
        const self = this;
        http.get('http://127.0.0.1:888/song/find?key=' + keys, (res) => {
            res.on("data",(data)=> {
                
                const obj = JSON.parse(data); // 输出请求到的body

                // 將歌曲資訊加入隊列
                if (!self.queue[guildID]) {
                    self.queue[guildID] = [];
                }

                self.queue[guildID].push({
                    name: obj.data.songname,
                    url: obj.data.url
                });

                // 如果目前正在播放歌曲就加入隊列，反之則播放歌曲
                if (self.isPlaying) {
                    msg.channel.send(`歌曲加入隊列：${obj.data.songname}`);
                } else {
                    self.isPlaying = true;
                    console.log("1\n")
                    self.playMusic(msg, guildID, self.queue[guildID]);
                }
            })
        });
    }

    playMusic(msg, guildID, music) {
        console.log("2\n")

        // 提示播放音樂
        msg.channel.send(`播放音樂：${music.name}`);
        console.log( self.queue[guildID].url);
        // 播放音樂
        this.dispatcher[guildID] = this.connection[guildID].play(music.url);

        // 把音量降 50%，不然第一次容易被機器人的音量嚇到 QQ
        this.dispatcher[guildID].setVolume(0.5);

        // 移除 queue 中目前播放的歌曲
        this.queue[guildID].shift();

        // 歌曲播放結束時的事件
        const self = this;
        this.dispatcher[guildID].on('finish', () => {

            // 如果隊列中有歌曲
            if (self.queue[guildID].length > 0) {
                self.playMusic(msg, guildID, self.queue[guildID].shift());
            } else {
                self.isPlaying = false;
                msg.channel.send('目前沒有音樂了，請加入音樂 :D');
            }

        });

    }

    resume(msg) {

        if (this.dispatcher[msg.guild.id]) {
            msg.channel.send('恢復播放');

            // 恢復播放
            this.dispatcher[msg.guild.id].resume();
        }

    }

    pause(msg) {

        if (this.dispatcher[msg.guild.id]) {
            msg.channel.send('暫停播放');

            // 暫停播放
            this.dispatcher[msg.guild.id].pause();
        }

    }

    skip(msg) {

        if (this.dispatcher[msg.guild.id]) {
            msg.channel.send('跳過目前歌曲');

            // 跳過歌曲
            this.dispatcher[msg.guild.id].end();
        }

    }

    nowQueue(msg) {

        // 如果隊列中有歌曲就顯示
        if (this.queue[msg.guild.id] && this.queue[msg.guild.id].length > 0) {
            // 字串處理，將 Object 組成字串
            const queueString = this.queue[msg.guild.id].map((item, index) => `[${index + 1}] ${item.name}`).join();
            msg.channel.send(queueString);
        } else {
            msg.channel.send('目前隊列中沒有歌曲');
        }

    }

    leave(msg) {

        // 離開頻道
        this.connection[msg.guild.id].disconnect();

    }
}

const music = new Music();

// 當 Bot 接收到訊息時的事件
client.on('message', async (msg) => {

    // 如果發送訊息的地方不是語音群（可能是私人），就 return
    if (!msg.guild) return;

    // !!join
    if (msg.content === `${prefix}join`) {

        // 機器人加入語音頻道
        music.join(msg);
        console.log("4\n")
    }

    // 如果使用者輸入的內容中包含 !!play
    if (msg.content.indexOf(`${prefix}play`) > -1) {

        // 如果使用者在語音頻道中
        if (msg.member.voice.channel) {

            // 播放音樂
            music.play(msg);
        } else {

            // 如果使用者不在任何一個語音頻道
            msg.reply('你必須先加入語音頻道');
        }
    }

    // !!resume
    if (msg.content === `${prefix}resume`) {

        // 恢復音樂
        music.resume(msg);
    }

    // !!pause
    if (msg.content === `${prefix}pause`) {

        // 暫停音樂
        music.pause(msg);
    }

    // !!skip
    if (msg.content === `${prefix}skip`) {

        // 跳過音樂
        music.skip(msg);
    }

    // !!queue
    if (msg.content === `${prefix}queue`) {

        // 查看隊列
        music.nowQueue(msg);
    }

    // !!leave
    if (msg.content === `${prefix}leave`) {

        // 機器人離開頻道
        music.leave(msg);
    }
});

// 連上線時的事件
client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
});

client.login(token);