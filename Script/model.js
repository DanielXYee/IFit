import * as tf from '@tensorflow/tfjs'
import * as posenet from '@tensorflow-models/posenet'
import * as hgnet from './hgNet'

// model initialize prarms
const imageScaleFactor = 0.5;
const outputStride = 16;
const flipHorizontal = false;

export async function loadModel(tiny=true){
    if (tiny){
       const net = await posenet.load(0.75)
       return new Model(net)
    }
    else {
       const net = await hgnet.load()
       return new Model(net)
    }
}

export class Model{
    constructor(net){
        this.net = net
    }
    async predict(inputs,imageScaleFactor, flipHorizontal, outputStride){
        const pose =await this.net.estimateSinglePose(inputs, imageScaleFactor, flipHorizontal, outputStride)
        return pose
    }
}