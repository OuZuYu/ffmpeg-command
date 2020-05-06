#!/usr/bin/env node
const fs = require('fs')
const ora = require('ora')
const inquirer = require('inquirer');
const ffmpeg = require('fluent-ffmpeg')
const commander = require('commander')
const { exec } = require('child_process');

const program = new commander.Command()
program
  .version('0.1.0')
  .command('cut <res-file>')
  .description('剪视频')
  .action(cutVideo)

program
  .command('2mp4 <res-file>')
  .description('转Mp4')
  .action(toMp4)

program.parse(process.argv)

const utils = {
  /**
   * HH:mm:ss 转换成秒数
   * @param {string} hms 时间，格式为HH:mm:ss
   */
  hmsToSeconds(hms) {
    const hmsArr = hms.split(':')

    return (+hmsArr[0]) * 60 * 60 + (+hmsArr[1]) * 60 + (+hmsArr[2])
  },

  /**
   * 秒数转换成 HH:mm:ss
   * @param {number}} seconds 秒数
   */
  secondsToHms(seconds) {
    const date = new Date(null)
    date.setSeconds(seconds)
    return date.toISOString().substr(11, 8)
  }
}

function cutVideo(resFile) {
  inquirer.prompt([
    {
      type: 'input',
      name: 'startTime',
      message: '请输入开始时间, 默认为 00:00:00 (HH:mm:ss)',
      default: '00:00:00',
    },
    {
      type: 'input',
      name: 'endTime',
      message: '请输入结束时间, 默认为视频结束时间 (HH:mm:ss)',
    },
    {
      type: 'input',
      name: 'fileName',
      default: `cut_${resFile}`,
      message: `请输入文件名称, 默认为 cut_${resFile}`,
    }
  ]).then(({ startTime, endTime, fileName }) => {
    ffmpeg
      .ffprobe(resFile, (err, metadata) => {
        if (err) {
          console.log(err)
          process.exit(1)
        }

        const suffix = resFile.split('.').pop()
        if (!/\.(mp4|avi|flv|mov|wmv|rm|rmvb)$/i.test(fileName)) {
          fileName = `${fileName}.${suffix}`
        }

        const videoDuration = metadata.format.duration // 视频总时长

        endTime = endTime || utils.secondsToHms(videoDuration)

        const startSecond = utils.hmsToSeconds(startTime)
        const endSecond = utils.hmsToSeconds(endTime)
        const cutDuration = (videoDuration - startSecond) - (videoDuration - endSecond)

        const cutDurationHms = utils.secondsToHms(cutDuration)

        console.log(`\n开始时间：${startTime}`)
        console.log(`结束时间：${endTime}`)
        console.log(`开始时间(s)：${startSecond}`)
        console.log(`结束时间(s)：${endSecond}`)
        console.log(`裁剪后时长(s)：${cutDuration}\n`)

        const cutTip = ora('正在裁剪视频...\n').start()
        exec(`ffmpeg -ss ${startTime} -t ${cutDurationHms} -i ${resFile} -vcodec copy -acodec copy ${fileName}`, (err, stdout, stderr) => {
          if (err) {
            console.log(err)
            process.exit()
          }
          cutTip.succeed(`已成功裁剪视频，输出为 ${fileName} `)
        })

        /*ffmpeg(resFile)
          .setStartTime(startTime)
          .setDuration(cutDuration)
          .saveToFile(fileName)
          .on('end', () => {
            cutTip.succeed(`已成功裁剪视频，输出为 ${fileName} `)
          })*/
      })

  })
}

function toMp4(resFile) {
  const outputName = `${resFile}.mp4`
  const tip = ora('正在转换视频为Mp4...\n').start()
  exec(`ffmpeg -i ${resFile} ${outputName}`, (err, stdout, stderr) => {
    if (err) {
      console.log(err)
      process.exit(1)
    }

    tip.succeed(`已成功转换视频，输出为 ${outputName}`)
  })
}