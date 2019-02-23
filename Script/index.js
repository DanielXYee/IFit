import * as tf from '@tensorflow/tfjs'
import Stats from 'stats.js'
import * as poseModel from './model'
import * as posenet from '@tensorflow-models/posenet'
import {drawKeypoints,drawSkeleton} from "./utils";

const imageScaleFactor = 0.5;
const outputStride = 16;
const flipHorizontal = false;

//camera and cavans size
const VIDEO_WIDTH = 800
const VIDEO_HEIGHT = 800

//DEBUG settings
const DEBUG = 1
const DRAW_IMAGE = true

//FPS
const stats = new Stats()

/**
 * Sets up a frames per second panel on the top-left of the window
 */
function setupFPS() {
    stats.showPanel(0); // 0: fps, 1: ms, 2: mb, 3+: custom
    document.body.appendChild(stats.dom);
}

/**
 *  Detect Poses
 * @param video Video Element
 * @param net
 */
function detectPoseInRealTime(video,model) {
    const canvas = document.getElementById('output');
    const ctx = canvas.getContext('2d');
    const div = document.getElementById('confidence')
    let minConfidence = 0.15
    // div.innerText= minConfidence.toString()
    // setInterval(()=>{
    //     minConfidence+=0.05
    //     div.innerText= minConfidence.toString()
    // },3000)

    canvas.width = VIDEO_WIDTH
    canvas.height= VIDEO_HEIGHT


    async function poseDetectionFrame() {
        stats.begin()

        let poses =[]

        let pose = await model.predict(video, imageScaleFactor, flipHorizontal, outputStride)

        if (DEBUG){
            console.log(pose)
        }
        poses.push(pose)

        ctx.clearRect(0, 0, VIDEO_WIDTH, VIDEO_HEIGHT)
        if (DRAW_IMAGE){
            ctx.save();
            ctx.scale(-1, 1);
            ctx.translate(-VIDEO_WIDTH, 0);
            ctx.drawImage(video,0,0,VIDEO_WIDTH,VIDEO_HEIGHT)
            ctx.restore();
        }



        let scale = 1
        let offset = [0,0]

        //todo draw boxes , keypoints and skeleton
        poses.forEach(()=>{
            // drawKeypoints(pose.keypoints,0,ctx,scale,offset,3,'yellow')
            drawKeypoints(pose.keypoints,minConfidence,ctx,scale,offset,4,'red')
            drawSkeleton(pose.keypoints,minConfidence,ctx,scale,offset)
        })

        stats.update()

        requestAnimationFrame(poseDetectionFrame)

    }


    stats.end()

    poseDetectionFrame()
}

async function setupCamera() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error(
            'Browser API navigator.mediaDevices.getUserMedia not available');
    }

    navigator.mediaDevices.enumerateDevices()
        .then(function(devices) {
            devices.forEach(function(device) {
                console.log(device.kind + ": " + device.label +
                    " id = " + device.deviceId);
            });
        })
        .catch(function(err) {
            console.log(err.name + ": " + err.message);
        })


    const stream =await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
            deviceId: { exact: 'f66bf10b9de27aa66f916bb1be2883d2d980a832ca1f3cca9c21d23ef01a2770' },
            width:VIDEO_WIDTH,
            height:VIDEO_HEIGHT
        }
    })

    // console.log(streams)

    const video = document.getElementById('video');
    video.width = VIDEO_WIDTH;
    video.height = VIDEO_HEIGHT;

    // const stream = await navigator.mediaDevices.getUserMedia({
    //     'audio': false,
    //     'video': {
    //         facingMode: 'user',
    //         width: VIDEO_WIDTH,
    //         height: VIDEO_HEIGHT,
    //     },
    // });
    video.srcObject = stream;

    return new Promise((resolve) => {
        video.onloadedmetadata = () => {
            resolve(video);
        };
    });
}

async function loadVideo() {
    const video = await setupCamera();
    video.play();

    return video;
}

async function loadImage(){
    console.log('load image...')
    const image = document.getElementById('image')
    return image
}

async function imageTest() {
    //load image
    let image = await loadImage()

    const canvas = document.getElementById('output')
    const ctx = canvas.getContext('2d')
    // const shape = input.shape.slice(0,2)
    const shape = [2*VIDEO_WIDTH,VIDEO_HEIGHT]
    canvas.width = shape[0]
    canvas.height= shape[1]

    let posenet = await poseModel.loadModel(true)
    let hgnet = await  poseModel.loadModel(false)

    let pose1  = await posenet.predict(image,imageScaleFactor, !flipHorizontal, outputStride)
    let pose2 =  await hgnet.predict(image,imageScaleFactor, !flipHorizontal, outputStride)

    let scale = VIDEO_WIDTH/513
    let offset = [0,0]

    ctx.drawImage(image,0,0,VIDEO_WIDTH,VIDEO_HEIGHT)
    drawKeypoints(pose1.keypoints,0,ctx,scale,offset)
    drawSkeleton(pose1.keypoints,0,ctx,scale,offset)

    ctx.translate(VIDEO_WIDTH,0)
    ctx.drawImage(image,0,0,VIDEO_WIDTH,VIDEO_HEIGHT)
    drawKeypoints(pose2.keypoints,0,ctx,scale,offset)
    drawSkeleton(pose2.keypoints,0,ctx,scale,offset)


}

function cropImage(img) {
    const Height = parseInt(img.shape[0] * 0.8);
    const Width = parseInt(img.shape[1] * 0.6);
    const beginHeight = parseInt((img.shape[0]-Height) / 2)
    const beginWidth = parseInt((img.shape[1]-Width) / 2)
    return img.slice([beginHeight, beginWidth, 0], [Height, Width, 3])
}

async function runDemo(){

    // //load pose model
    let model =await poseModel.loadModel(false)

    //load video
    let video = await loadVideo()
    //
    setupFPS()

    detectPoseInRealTime(video,model)



}

runDemo()
// imageTest()