import * as tf from '@tensorflow/tfjs'
import Stats from 'stats.js'
import * as poseModel from '../../Script/model'
import {drawKeypoints, drawSkeleton, getActiveKeypoints} from "../../Script/utils"
import dat from 'dat.gui'

const imageScaleFactor = 0.5;
const outputStride = 16;
const flipHorizontal = false;

//camera and cavans size
const VIDEO_WIDTH = 400 //540
const VIDEO_HEIGHT =400 //600

//DEBUG settings
const DEBUG = 0
//FPS
const stats = new Stats()

// function changeVal(obj){
//     var val=document.getElementById("changeit");
//     var v = document.getElementById('camera');
//     if(val.innerHTML=="start"){
//         obj.innerHTML="end";
//         val.setAttribute("class", "am-btn am-btn-danger am-round");
//         if(v.src=="")
//         {
//             mycamera();
//             loadvideo();
//         }
//         else
//             v.play();
//     }else if(val.innerHTML=="end")
//     {
//         obj.innerHTML="start";
//         v.pause();
//         val.setAttribute("class", "am-btn am-btn-success am-round");
//     }
// }

// $(document).ready(function () {
//     /* 图片滚动效果 */
//     $(".mr_frbox").slide({
//         titCell: "",
//         mainCell: ".mr_frUl ul",
//         autoPage: true,
//         effect: "leftLoop",
//         vis: 4
//     });
// });

/**
 * Sets up a frames per second panel on the top-left of the window
 */
function setupFPS() {
    stats.showPanel(0); // 0: fps, 1: ms, 2: mb, 3+: custom
    document.body.appendChild(stats.dom);
}

/**
 *  Detect Poses
 * @param camera Video Element
 * @param model
 */
function detectPoseInRealTime(camera,model) {
    const canvas = document.getElementById('output');
    const ctx = canvas.getContext('2d');

    canvas.width = VIDEO_WIDTH
    canvas.height= VIDEO_HEIGHT

    async function poseDetectionFrame() {

        if (guiState.changeCameraDevice){
            camera =await loadCamera(guiState.changeCameraDevice)
            guiState.changeCameraDevice = null
        }

        stats.begin()

        let poses =[]

        let pose = await model.predict(camera, imageScaleFactor, flipHorizontal, outputStride)

        pose.keypoints = getActiveKeypoints(pose.keypoints,guiState.confidence.minPoseConfidence,guiState.deactiveArray)

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

/**
 *  get all camera devices
 */
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

/**
 * set camera steams
 */
async function setupCamera(deviceId) {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error(
            'Browser API navigator.mediaDevices.getUserMedia not available');
    }

    const video = document.getElementById('camera');
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

    return new Promise((resolve) => {
        video.onloadedmetadata = () => {
            resolve(video)
        }
    })
}

/**
 * load comic models
 */
function setupVideo() {
    const video = document.getElementById('trainVideo');
    video.width = VIDEO_WIDTH;
    video.height = VIDEO_WIDTH;

    video.src = 'http://localhost:1234/static/videos/dance.mov'

    return video

}
async function loadVideo() {
    const video = await setupVideo()

    return video
}

/**
 * load camera
 */
async function loadCamera(deviceId=null) {
    const camera = await setupCamera(deviceId)
    camera.play()

    return camera
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

/**
 * set up gui config
 * @param cameras
 */
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

async function runDemo(){

    // //load pose model
    let model =await poseModel.loadModel(false)

    let video = await loadVideo()

    let cameras = await getCameras()

    if (cameras.length>0){
        //load video
        guiState.camera.deviceName = cameras[0].name
        let camera = await loadCamera(cameras[0].id)

        setupGui(cameras)
        setupFPS()

        detectPoseInRealTime(camera,model)
    }
}

runDemo()