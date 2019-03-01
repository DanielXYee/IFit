import * as tf from '@tensorflow/tfjs'
import Stats from 'stats.js'
import * as poseModel from './model'
import {drawKeypoints, drawSkeleton, getActiveKeypoints} from "./utils"
import yolo, { downloadModel } from 'tfjs-yolo-tiny'
import dat from 'dat.gui'
import {drawPoseNetSkeleton} from "./posenetUtil";

const imageScaleFactor = 0.5;
const outputStride = 16;
const flipHorizontal = false;

//camera and cavans size
const VIDEO_WIDTH = 600 //540
const VIDEO_HEIGHT =600 //600

//DEBUG settings
const DEBUG = 0
//FPS
const stats = new Stats()

/**
 * Sets up a frames per second panel on the top-left of the window
 */
function setupFPS() {
    stats.showPanel(0); // 0: fps, 1: ms, 2: mb, 3+: custom
    document.body.appendChild(stats.dom);
}

function detectBoxInRealTime(video,model) {
    const canvas = document.getElementById('output');
    const ctx = canvas.getContext('2d');
    const div = document.getElementById('confidence')

    canvas.width = VIDEO_WIDTH
    canvas.height= VIDEO_HEIGHT

    async function boxDetectionFrame() {
        stats.begin()

        let imageInput = tf.fromPixels(video).expandDims(0)

        imageInput =tf.image.resizeBilinear(imageInput,[416,416])

        let persons = []

        const boxes = await yolo(imageInput, model)

        ctx.clearRect(0, 0, VIDEO_WIDTH, VIDEO_HEIGHT)
        if (DRAW_IMAGE){
            ctx.save();
            ctx.scale(-1, 1);
            ctx.translate(-VIDEO_WIDTH, 0);
            ctx.drawImage(video,0,0,VIDEO_WIDTH,VIDEO_HEIGHT)
            ctx.restore();
        }

        boxes.forEach((box)=>{
            const {
                top, left, bottom, right, classProb, className,
            } = box;
            if (className =='person'){
                ctx.strokeRect(left, top, right-left, bottom-top)
            }
        })

        stats.update()

        requestAnimationFrame(boxDetectionFrame)
    }

    stats.end()

    boxDetectionFrame()
}

/**
 *  Detect Poses
 * @param video Video Element
 * @param net
 */
function detectPoseInRealTime(camera,model) {
    const canvas = document.getElementById('output');
    const ctx = canvas.getContext('2d');

    canvas.width = VIDEO_WIDTH
    canvas.height= VIDEO_HEIGHT

    async function poseDetectionFrame() {

        if (guiState.changeCameraDevice){
            camera =await loadVideo(guiState.changeCameraDevice)
            guiState.changeCameraDevice = null
        }

        stats.begin()

        let poses =[]

        let pose = await model.predict(camera, imageScaleFactor, flipHorizontal, outputStride)

        pose.keypoints = getActiveKeypoints(pose.keypoints,guiState.confidence.minPoseConfidence,guiState.deactiveArray)

        console.log(pose.keypoints)

        if (DEBUG){
            console.log(pose)
        }
        poses.push(pose)

        ctx.clearRect(0, 0, VIDEO_WIDTH, VIDEO_HEIGHT)
        if (guiState.output.showVideo){
            ctx.save();
            ctx.scale(-1, 1);
            ctx.translate(-VIDEO_WIDTH, 0);
            if (guiState.output.showVideo){
                ctx.drawImage(camera,0,0,VIDEO_WIDTH,VIDEO_HEIGHT)
            }
            ctx.restore();
        }

        let scale = 1
        let offset = [0,0]

        //todo draw boxes , keypoints and skeleton
        poses.forEach(()=>{
            if (guiState.output.showPoints){
                drawKeypoints(pose.keypoints,ctx,scale,offset,4,'red')
            }
            if (guiState.output.showSkeleton){
                drawSkeleton(pose.keypoints,ctx,scale,offset)
            }
        })

        stats.update()

        requestAnimationFrame(poseDetectionFrame)

    }


    stats.end()

    poseDetectionFrame()
}

async function setupCamera(deviceId) {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error(
            'Browser API navigator.mediaDevices.getUserMedia not available');
    }

    const video = document.getElementById('video');
    video.width = VIDEO_WIDTH;
    video.height = VIDEO_HEIGHT;

    if (deviceId!=null){
        const stream =await navigator.mediaDevices.getUserMedia({
            audio: false,
            video: {
                deviceId: { exact: deviceId },
                width:VIDEO_WIDTH,
                height:VIDEO_HEIGHT
            }
        })

        video.srcObject = stream;
    }
    else {
        const stream = await navigator.mediaDevices.getUserMedia({
            'audio': false,
            'video': {
                facingMode: 'user',
                width: VIDEO_WIDTH,
                height: VIDEO_HEIGHT,
            },
        })

        video.srcObject = stream;
    }

    // video.src  = 'http://localhost:1234/static/videos/dancecrop.mp4'

    return new Promise((resolve) => {
        video.onloadedmetadata = () => {
            resolve(video)
        }
    })
}

async function loadVideo(deviceId=null) {
    const video = await setupCamera(deviceId)
    video.play()

    return video
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
    drawKeypoints(pose1.keypoints,ctx,scale,offset,3,'aqua')
    // drawSkeleton(pose1.keypoints,0,ctx,scale,offset)

    ctx.translate(VIDEO_WIDTH,0)
    ctx.drawImage(image,0,0,VIDEO_WIDTH,VIDEO_HEIGHT)
    drawPoseNetKeypoints(pose2.keypoints,0,ctx)
    // drawSkeleton(pose2.keypoints,0,ctx,scale,offset)


}


async function ODTest(){
    let model = await downloadModel()

    let video = await loadVideo()

    setupFPS()

    detectBoxInRealTime(video,model)
}

const guiState = {
    confidence:{
        minPoseConfidence:0.15,
    },
    joints:{
        rightAnkle:true,
        rightKnee:true,
        rightHip:true,
        leftHip:true,
        leftKnee:true,
        leftAnkle:true,
        Pelvis:true,
        thorax:true,
        upperNeck:true,
        headTop:true,
        rightWrist:true,
        rightElbow:true,
        rightShoulder:true,
        leftShoulder:true,
        leftElbow:true,
        leftWrist:true
    },
    output:{
        showVideo:true,
        showSkeleton:true,
        showPoints:true
    },
    camera:{
        deviceName:null
    },
    deactiveArray:[]
}

const Joints = [
        'rightAnkle',
        'rightKnee',
        'rightHip',
        'leftHip',
        'leftKnee',
        'leftAnkle',
        'Pelvis',
        'thorax',
        'upperNeck',
        'headTop',
        'rightWrist',
        'rightElbow',
        'rightShoulder',
        'leftShoulder',
        'leftElbow',
        'leftWrist'
]

Array.prototype.remove = function(val) {
    var index = this.indexOf(val);
    if (index > -1) {
        this.splice(index, 1);
    }
}

function setupGui(cameras) {

    const gui = new dat.GUI({width:300})

    let confidence = gui.addFolder('Confidence Controller')
    confidence.add(guiState.confidence,'minPoseConfidence',0.0,1.0)

    let joints = gui.addFolder('Joint Controller')
    for (let k in guiState.joints){
        let c = joints.add(guiState.joints,k.toString())
        c.onChange(function () {
            let index = Joints.indexOf(k.toString())
            if (guiState.joints[k]){
                guiState.deactiveArray.remove(index)
            }
            else {
                guiState.deactiveArray.push(index)
            }
            if(DEBUG) {
                console.log(guiState.deactiveArray)
            }
        })
    }

    let output = gui.addFolder('Output')
    output.add(guiState.output, 'showVideo')
    output.add(guiState.output, 'showSkeleton')
    output.add(guiState.output, 'showPoints')
    output.open()

    let cameraNames = []
    let cameraIds = []
    cameras.forEach(({name,id})=>{
        cameraNames.push(name)
        cameraIds.push(id)
    })

    let camera = gui.addFolder('Camera')
    const cameraController =  camera.add(guiState.camera,'deviceName',cameraNames)

    cameraController.onChange(function(name) {
        guiState.changeCameraDevice = cameraIds[cameraNames.indexOf(name)];
    });

}

async function getCameras() {

    let cameras =navigator.mediaDevices.enumerateDevices()
        .then(function(devices) {
            let cameras = []
            devices.forEach(function(device) {
                if (device.kind=='videoinput'){
                    let camera = {
                        name:device.label,
                        id:device.deviceId
                    }
                    cameras.push(camera)
                }
            })
            return cameras
        })
        .catch(function(err) {
            console.log(err.name + ": " + err.message);
        })

    return cameras
}

async function runDemo(){

    // //load pose model
    let model =await poseModel.loadModel(false)

    let cameras = await getCameras()

    if (cameras.length>0){
        //load video
        guiState.camera.deviceName = cameras[0].name
        let video = await loadVideo(cameras[0].id)

        setupGui(cameras)
        setupFPS()

        detectPoseInRealTime(video,model)
    }
}

// runDemo()
// ODTest()
imageTest()