import * as tf from '@tensorflow/tfjs';

const color = 'aqua';
const lineWidth = 2;
const boundingBoxColor ='red'

const links = [[0,1],[1,2],[2,6],[3,6],[4,3],[5,4],[10,11],[11,12],[12,8],[13,8],[14,13],[15,14]]
const angles = [[0,1],[1,2],[2,3],[3,4],[4,5],[6,7],[7,8],[8,9],[9,10],[10,11]]

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
export function drawSegment([ay, ax], [by, bx], color, scale, ctx,offset) {
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
export function drawSkeleton(keypoints, minConfidence, ctx, scale = 1,offset=[0,0]) {
  const adjacentKeyPoints = links

  adjacentKeyPoints.forEach((link) => {
    if (keypoints[link[0]].score>minConfidence&&keypoints[link[1]].score>minConfidence){
        drawSegment(toTuple(keypoints[link[0]].position),
            toTuple(keypoints[link[1]].position), color, scale, ctx,offset);
    }
  })
}

/**
 * Draw pose keypoints on to a canvas
 */
export function drawKeypoints(keypoints, minConfidence, ctx, scale = 1,offset=[0,0],radius=3,color) {
  for (let i = 0; i < keypoints.length; i++) {
    const keypoint = keypoints[i];

    if (keypoint.score < minConfidence) {
      continue;
    }

    const [y, x] = toTuple(keypoint.position);
    drawPoint(ctx, y * scale+offset[1], x * scale+offset[0], radius, color);
  }
}


/**
 * Draw the bounding box of a pose. For example, for a whole person standing
 * in an image, the bounding box will begin at the nose and extend to one of
 * ankles
 */
export function drawBoundingBox(boundingBox, ctx) {

  ctx.rect(boundingBox.minX, boundingBox.minY,
    boundingBox.maxX - boundingBox.minX, boundingBox.maxY - boundingBox.minY);

  ctx.strokeStyle = boundingBoxColor;
  ctx.stroke();
}

/**
 * Draw an image on a canvas
 */
export function renderImageToCanvas(image, size, canvas) {
  console.log(size)
  canvas.width = size[0];
  canvas.height = size[1];
  const ctx = canvas.getContext('2d');

  ctx.drawImage(image, 0, 0);
}

