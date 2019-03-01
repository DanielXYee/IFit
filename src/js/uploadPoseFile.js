import * as tf from '@tensorflow/tfjs'
import Stats from 'stats.js'
import * as poseModel from '../../Script/model'
import {drawKeypoints, drawSkeleton, getActiveKeypoints} from "../../Script/utils"
import dat from 'dat.gui'
import $ from 'jquery'

const imageScaleFactor = 0.5;
const outputStride = 16;
const flipHorizontal = true;

//camera and cavans size
const VIDEO_WIDTH = 400 //540
const VIDEO_HEIGHT =400 //600

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

let allPose = []

/**
 *  Detect Poses
 * @param camera Video Element
 * @param model
 */
function detectPoseInRealTime(video,model) {
    const canvas = document.getElementById('output');
    const ctx = canvas.getContext('2d');

    canvas.width = VIDEO_WIDTH
    canvas.height= VIDEO_HEIGHT



    async function poseDetectionFrame() {

        stats.begin()

        let poses =[]

        let videoTime = video.currentTime

        let pose = await model.predict(video, imageScaleFactor, flipHorizontal, outputStride)
        pose.keypoints = getActiveKeypoints(pose.keypoints,guiState.confidence.minPoseConfidence,guiState.deactiveArray)
        pose.time = videoTime
        poses.push(pose)

        if (videoConfig.videoState=='play'){
            allPose.push(pose)
        }

        ctx.clearRect(0, 0, VIDEO_WIDTH, VIDEO_HEIGHT)
        if (guiState.output.showVideo){
            ctx.save();
            if (guiState.output.showVideo){
                ctx.drawImage(video,0,0,VIDEO_WIDTH,VIDEO_HEIGHT)
            }
            ctx.restore();
        }

        let scale = 1
        let offset = [0,0]

        //todo draw boxes , keypoints and skeleton
        poses.forEach((pose)=>{
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

const videoConfig ={
    videoState:'ended',
    // videoUrl:'http://localhost:1234/static/videos/down.mp4',
    videoUrl:'http://localhost:1234/static/videos/jianshencrop.mp4',
    jsonUpdateUrl:'http://localhost:1234/upload',
    formDataUpdateUrl:'http://localhost:1234/videos/upload?courseId=1&intro=1'

}

/**
 * send poses file to back use Json
 */
function sendPoseJsonToBackUseJson(poses) {
    $.ajax({
        type: 'post',
        contentType: 'application/json',
        url: videoConfig.jsonUpdateUrl,
        data: JSON.stringify(poses)
    }).done(function (r) {
        console.log('success!');
    }).fail(function (jqXHR) {
        // Not 200:
        alert('Error:' + jqXHR.status);
    });
}

/**
 * send poses file to back
 */
function sendPoseJsonToBackUseFormData(poses) {
    let formData = new FormData()
    formData.append('video','1')
    formData.append('poseFile',poses)

    $.ajax({
        type: 'post',
        contentType: false, // 注意这里应设为false
        processData: false,
        cache: false,
        url: videoConfig.formDataUpdateUrl,
        data: formData
    }).done(function (r) {
        console.log('success!');
    }).fail(function (jqXHR) {
        // Not 200:
        alert('Error:' + jqXHR.status);
    });
}

/**
 * load comic models
 */
function setupVideo() {
    const video = document.getElementById('video');
    video.width = VIDEO_WIDTH;
    video.height = VIDEO_WIDTH;

    video.src = videoConfig.videoUrl

    video.addEventListener('play',function () {
        videoConfig.videoState='play';
    });

    video.addEventListener('pause',function () {
        videoConfig.videoState='pause';
    });

    video.addEventListener('ended',function () {
        videoConfig.videoState='ended';
        console.log(allPose)
        sendPoseJsonToBackUseJson(allPose)
        // sendPoseJsonToBackUseFormData(allPose)
        allPose = []
        video.pause();
    });

    return video

}

async function loadVideo() {
    const video = await setupVideo()

    return video
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
function setupGui() {

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

}

async function runDemo(){

    // //load pose model
    let model =await poseModel.loadModel(false)

    let video = await loadVideo()

    setupGui()
    setupFPS()

    detectPoseInRealTime(video,model)
}

runDemo()