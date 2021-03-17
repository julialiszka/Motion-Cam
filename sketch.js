/*
Julia Liszka
Webcam tracking
March 18 2021

Motion Cam:
Visually similar to a thermal camera, but instead 
of tracking temperature, tracks motion

font from: https://www.dafont.com/code-7x5.font
*/

let video;
let gridSize = 12;      // spacing to check flow
let ignoreThresh = 12;  // ignore movements below this level
let flow;               // calculated flow for entire image
let previousPixels;     // copy of previous frame

let still1, still2, lowMotion, highMotion; // colors

let font;

let minWidth; // minimum of windowWidth and video.width to make sure elements scale to output

function preload() {
	font = loadFont('assets/Code 7x5.ttf');
}

function setup() {
	frameRate(20);

	//set canvas/video size
	createCanvas(windowWidth, windowHeight);
	video = createCapture(VIDEO);
	video.size(height*6/4, height);

	video.hide();

	//set colors
	still1     = color('rgba(0, 0, 200, 0.2)'); 	// blue
	still2     = color('rgba(0, 200, 100, 0.2)'); 	// green
	lowMotion  = color('rgba(250, 250, 50, 0.4)'); 	// yellow
	highMotion = color('rgba(250, 50, 50, 0.4)'); 	// red

	//same colors, but not transparent
	s1 = color('rgb(0, 0, 200)'); 		// blue
	s2 = color('rgb(0, 200, 100)'); 	// green
	lm = color('rgb(250, 250, 50)'); 	// yellow
	hm = color('rgb(250, 50, 50)'); 	// red

	flow = new FlowCalculator(gridSize);

	// draw black background only once in case screen is wider than output, 
	// so the color does not interfere with the color of transparent squares
	background(0);
}

function draw() {
	noStroke();
	video.loadPixels();

	// measurements to properly center video on screen
	let centerX = width/2 - video.width/2;
	let centerY = height/2 - video.height/2;
	minWidth = min(width, video.width);

	if (video.pixels.length > 0) {

		// calculate flow if it has changed from the previous frame
		if (previousPixels) {
			if (same(previousPixels, video.pixels, 4, width)) {
				return;
			}
			flow.calculate(previousPixels, video.pixels, video.width,video.height);
		}

		// display flow zones
		if (flow.zones) {
			for (let zone of flow.zones) {
				// blue - no movement
				if (zone.mag < ignoreThresh*0.7){ 
					fill(still1);
				}
				// green - slight amount of movement detected (most likely error)
				else if (zone.mag < ignoreThresh) {
					fill(still2);
				}
				// yellow to red - noticable movement
				else { 
					// scale magnitude to be between 0 and 1
					let scaledMag = map(zone.mag, 10, 30, 0, 1); 
					// choose color based on how fast the movement is
					let color = lerpColor(lowMotion, highMotion, scaledMag);
					fill(color);
				}

				push();

				// translate to location of flow zone, centered on screen
				translate(zone.pos.x + centerX, zone.pos.y + centerY);

				// draw rounded squares
				noStroke();
				rectMode(CENTER);
				let sizeMod = map(zone.mag, 8, 50, 2.6, 2.3); // slightly change size based on maginitude
				square(gridSize*2.3/15, gridSize*2.3/15, gridSize*sizeMod, 5);

				pop(); 
			}
		}

		// update to be able to compare change to calculate movement
		previousPixels = copyImage(video.pixels, previousPixels);
	}

	stroke(170);
	strokeWeight(2);

	push();
	translate(width/2, height/2); // center of screen

	// draw center crosshair
	line(gridSize, 0, gridSize, gridSize*2);
	line(0, gridSize, gridSize*2, gridSize);
	noFill();
	circle(gridSize, gridSize, 8);

	// variables to shift by
	let m = gridSize*2; // used for start point
	let n = gridSize*3.5; // used for end point
	let leftover = (minWidth % m); // used to make sure left side is correct because
								   // width of dispaly my no be disvisible by gridSize																					

	// draw L-shapes in each corner
	line(-minWidth/2+m, -height/2+m, -minWidth/2+n, -height/2+m);
	line(-minWidth/2+m, -height/2+m, -minWidth/2+m, -height/2+n);

	line(minWidth/2-m-leftover, -height/2+m, minWidth/2-n-leftover, -height/2+m);
	line(minWidth/2-m-leftover, -height/2+m, minWidth/2-m-leftover, -height/2+n);
	
	line(minWidth/2-m-leftover, height/2-m, minWidth/2-n-leftover, height/2-m);
	line(minWidth/2-m-leftover, height/2-m, minWidth/2-m-leftover, height/2-n);
	
	line(-minWidth/2+m, height/2-m, -minWidth/2+n, height/2-m);
	line(-minWidth/2+m, height/2-m, -minWidth/2+m, height/2-n);
	
	pop();

	
	// used to find how far on the left the scale should be
	let xSpot; 
	if (minWidth == width) {
		xSpot = minWidth-(gridSize*3);
	}
	else {
		let buffer = (width-video.width)/2;
		xSpot = width-buffer-(gridSize*3);
	}
	xSpot -= leftover;

	noStroke();


	// text/numbers
	textFont(font);
	textSize(gridSize);
	fill(170);
	// title
	textAlign(CENTER, BASELINE);
	text('Motion Cam', width/2, n);
	// scale label
	textAlign(RIGHT, TOP);
	text('100% ', xSpot, video.height*0.25);
	textAlign(RIGHT, BASELINE);
	text('0% ', xSpot, video.height*0.75);


	// draw colored 'temp' scale
	// (some thermal cameras have a temperature scale on the side 
	//  to show what temperature is what color)
	let scaleC;
	let mapping;
	let rectHeight = 0;
	// loop drawing a color gradient square by square, 
	// making gradient using lerp color
	for(let i=height*0.25; i<height*0.75; i+= gridSize) {
		// red to yellow
		if (i < height*0.42) {
			mapping = map(i, height*0.25, height*0.42, 0, 1);
			scaleC = lerpColor(hm, lm, mapping);
		}
		// yellow to green
		else if (i < height*0.58) {
			mapping = map(i, height*0.42, height*0.58, 0, 1);
			scaleC = lerpColor(lm, s2, mapping);
		}
		//green to blue
		else {
			mapping = map(i, height*0.58, height*0.75, 0, 1);
			scaleC = lerpColor(s2, s1, mapping);
		}
		fill(scaleC); // uses color calculated above
		rect(xSpot, i, gridSize, gridSize);
		rectHeight+=gridSize; // tracks size to draw rectangular outline around the squares
	}

	// outline 'temp' scale
	noFill();
	stroke(170);
	rect(xSpot, video.height*0.25, gridSize, rectHeight);

}

// when window is resized, resize video/canvas
function windowResized() {
	setup();
}