import * as tf from '@tensorflow/tfjs';

const color = 'aqua';
const lineWidth = 2;
const boundingBoxColor ='red'

const links = [[0,1],[1,2],[2,6],[3,6],[4,3],[5,4],[10,11],[11,12],[12,8],[13,8],[14,13],[15,14],[7,8],[8,9],[7,3],[7,2]]
const angles = [[0,1],[1,2],[2,3],[3,4],[4,5],[6,7],[7,8],[8,9],[9,10],[10,11],[8,13],[9,13]]

function toTuple({y, x}) {
  return [y, x];
}

/**
 * Draws a point on a canvas
 */
export function drawPoint(ctx, y, x, r, color) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, 2 * Math.PI);
  ctx.fillStyle = color;
  ctx.fill();
}

/**
 * Draws a line on a canvas
 */
export function drawSegment([ay, ax], [by, bx], color, scale,offset,ctx) {
  ctx.beginPath();
  ctx.moveTo(ax * scale+offset[0], ay * scale+offset[1]);
  ctx.lineTo(bx * scale+offset[0], by * scale+offset[1]);
  ctx.lineWidth = lineWidth;
  ctx.strokeStyle = color;
  ctx.stroke();
}

/**
 * Draws a pose skeleton
 */
export function drawSkeleton(keypoints, ctx, scale = 1,offset=[0,0]) {
  const adjacentKeyPoints = links

  adjacentKeyPoints.forEach((link) => {
    let joint1 = keypoints[link[0]]
    let joint2 = keypoints[link[1]]
    if (joint1.active&&joint2.active){
        drawSegment(toTuple(joint1.position), toTuple(joint2.position), color, scale,offset,ctx)
    }
  })
}

/**
 * Draw pose keypoints on to a canvas
 */
export function drawKeypoints(keypoints, ctx, scale = 1,offset=[0,0],radius=3,color) {
  for (let i = 0; i < keypoints.length; i++) {
    const keypoint = keypoints[i]

    if (keypoint.active){
        const [y, x] = toTuple(keypoint.position)
        drawPoint(ctx, y * scale+offset[1], x * scale+offset[0], radius, color)
    }
  }
}


/**
 * Draw the bounding box of a pose. For example, for a whole person standing
 * in an image, the bounding box will begin at the nose and extend to one of
 * ankles
 */
export function drawBoundingBox(boundingBox, ctx) {

  ctx.rect(boundingBox.minX, boundingBox.minY,
    boundingBox.maxX - boundingBox.minX, boundingBox.maxY - boundingBox.minY)

  ctx.strokeStyle = boundingBoxColor
  ctx.stroke();
}

/**
 * Draw an image on a canvas
 */
export function renderImageToCanvas(image, size, canvas) {
  // console.log(size)
  canvas.width = size[0];
  canvas.height = size[1];
  const ctx = canvas.getContext('2d');

  ctx.drawImage(image, 0, 0);
}

export function getActiveKeypoints(kepoints,minConfidence,deactivateArray) {
    for (let i =0;i<deactivateArray.length;i++){
      kepoints[deactivateArray[i]].active=false
    }

    kepoints.map((kp)=>{
      if (kp.score<minConfidence){
        kp.active = false
      }
    })

    return kepoints
}

/**
 * length
 */
function norm([ax,ay]) {
    return Math.sqrt(ax*ax+ay*ay)
}

/**
 * 1D tensor dot
 */
function dot([ax,ay],[bx,by]) {
    return ax*bx + ay * by
}

/**
 * get angel's cos
 * @param tensor1
 * @param tensor2
 * @returns {number}
 */
function cos(tensor1,tensor2) {
    return (dot(tensor1,tensor2))*1.0/ (norm(tensor1)* norm(tensor2))
}

function getTensor([x1,y1],[x2,y2]) {
  return [x1-x2,y1-y2]
}


function getAngelCos(kps,angelIndex) {
    //get two links
    let linkIndexs = angles[angelIndex]
    // console.log(linkIndexs)
    let tensors = linkIndexs.map((linkIndex)=>{
        let link = links[linkIndex]
        return getTensor(toTuple(kps[link[0]].position),toTuple(kps[link[1]].position))
    })

    return cos(tensors[0],tensors[1])

}

/**
 * @param kp1 kepoints from a pose
 * @param kp2 kepoints from the other pose
 * @param angelIndex Index of angels
 */
function compareTwoAngel(kps1,kps2,angelIndex,threshHold){
    // console.log(angelIndex)
    let score1 = getAngelCos(kps1,angelIndex)
    let score2 = getAngelCos(kps2,angelIndex)
    return Math.abs(score1-score2)<=threshHold
}

/**
 * compare two keypoints use angel
 * @param kp1
 * @param kp2
 * @param threshHold
 * @returns {Promise<void>}
 */
export function compareTwoPose(kps1,kps2,threshHold){
  let linksStatus = links.map(link=>{
      let joint1 = kps1[link[0]]
      let joint2 = kps1[link[1]]
      if (joint1.active&&joint2.active){
          return true
      }
      else {
          return false
      }
  })

  let passStates = []

  for (let i=0;i<angles.length;i++) {
      let angel = angles[i]
      let [link1, link2] = angel
      if (linksStatus[link1] && linksStatus[link2]) {
          // console.log(i)
          let isPass = compareTwoAngel(kps1,kps2,i,threshHold)
          passStates.push(isPass)
      }
  }

  console.log(passStates)

  return passStates
}





