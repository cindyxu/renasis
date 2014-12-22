var scene = new THREE.Scene(); 

var containerWidth = window.innerWidth;
var containerHeight = window.innerHeight;

var camera = new THREE.PerspectiveCamera( 75, containerWidth / containerHeight, 0.1, 1000 ); 
var renderer = new THREE.WebGLRenderer({ alpha: true }); 
renderer.setSize( containerWidth, containerHeight ); 
document.body.appendChild( renderer.domElement );

var stats = new Stats();
stats.setMode(0); // 0: fps, 1: ms
// align top-left
stats.domElement.style.position = 'absolute';
stats.domElement.style.left = '0px';
stats.domElement.style.top = '0px';
document.body.appendChild( stats.domElement );

var rendererStats = new THREEx.RendererStats();
rendererStats.domElement.style.position = 'absolute';
rendererStats.domElement.style.left = '0px';
rendererStats.domElement.style.bottom = '0px';
document.body.appendChild( rendererStats.domElement );

// controls = new THREE.TrackballControls( camera );
// controls.target.set( 0, 0, 0 );
// controls.rotateSpeed = 1.0;
// controls.zoomSpeed = 1.2;
// controls.panSpeed = 0.8;
// controls.staticMoving = true;

var skeletonMaterial = new THREE.MeshBasicMaterial( { color: 0xee0088 } ); 
var vertexMaterial = new THREE.MeshBasicMaterial( { color: 0x0099ff } ); 
var skinMaterial = new THREE.MeshBasicMaterial( { color: 0xffaa00 } ); 
var jointGeometry = new THREE.SphereGeometry( 0.3 );
var raycaster = new THREE.Raycaster();

var bodyShapes = [];

function interp(i0, i1, f) {
	return i0 + (i1 - i0) * f;
}

function createParamTubeGeometry( funcX, funcZ, height, tsegs, rsegs ) {

	var geometry = new THREE.Geometry();

	geometry.tsegs = tsegs;
	geometry.rsegs = rsegs;
	geometry.height = height;
	geometry.funcX = funcX;
	geometry.funcZ = funcZ;

	geometry.ringScales = [];

	function buildSegmentVertices(closeTop, closeBottom) {
		for (var ri = 0; ri <= rsegs; ri++) {
			buildRingVertices(ri);
		}

		if (closeTop) {
			var vtop = new THREE.Vector3(0, 0, 0);
			geometry.vertices.push(vtop);
		}

		if (closeBottom) {
			var vbot = new THREE.Vector3(0, height, 0);
			geometry.vertices.push(vbot);
		}
	}

	function buildRingVertices(ri) {
		for ( ti = 0; ti < tsegs; ti ++ ) {
			vector = new THREE.Vector3();
			geometry.vertices.push(vector);
		}
		geometry.ringScales[ri] = 1;
		calculateRing(ri);
	}

	geometry.distort = function(trindex, radius, distortion) {
		var segHeight = (height/rsegs);
		var ydist, frac;

		function distortRing(rindex) {
			ydist = Math.abs((ri - trindex) * segHeight);
			if (ydist > radius) return false;

			frac = (radius - ydist) / radius;
			geometry.ringScales[ri] += frac * distortion;
			
			calculateRing(ri);
			return true;
		}

		for (ri = trindex; ri <= rsegs; ri++) {
			if (!distortRing(ri)) break;
		}

		for (ri = trindex-1; ri >= 0; ri--) {
			if (!distortRing(ri)) break;
		}
	};

	function calculateRing(rindex) {
		var vertices = geometry.vertices;
		var hfrac = (rindex / geometry.tsegs);
		var rheight = height * hfrac;
		
		var nscale = geometry.ringScales[rindex];
		
		for ( ti = 0; ti < tsegs; ti++) {
			tfrac = ti / tsegs;
			xi = funcX(hfrac, tfrac);
			zi = funcZ(hfrac, tfrac);
			vertices[rindex * tsegs + ti].set(xi * nscale, rheight, zi * nscale);
		}
	}

	buildSegmentVertices();
	// geometry.distort(10, 5, 1.5);

	function buildSegmentFaces() {

		var numVertices = geometry.vertices.length;
		var faces = geometry.faces;

		// sides
		for (var ri = 0; ri < rsegs; ri++) {
			var offset = ri * tsegs;
			for (var ci = 0; ci <= tsegs; ci++) {

				var v0 = offset + (( ci ) % tsegs );
				var v1 = offset + (( ci + 1 ) % tsegs );
				var v2 = offset + tsegs + (( ci + 1 ) % tsegs );
				var v3 = offset + tsegs + (( ci ) % tsegs );

				var face = new THREE.Face3( v2, v1, v0 );
				faces.push(face);
				var face2 = new THREE.Face3( v3, v2, v0 );
				faces.push(face2);
			}
		}
		// top
	}

	buildSegmentFaces();

	geometry.computeFaceNormals();
	geometry.computeVertexNormals();

	return geometry;
}

var skeleton = {
	head: [0, 2, 0],
	chest: [0, 0, 0],
	shoulder: [3, -2, 0],
	clavicle: [2, -0.5, 0],
	elbow: [4, -6, 0],
	wrist: [5,-10, 0],
	torso: [0, -4, 0],
	pelvis: [0, -7, 0],
	hip: [2.5, -8, 0],
};

var mirror = {
	clavicle: true,
	shoulder: true,
	elbow: true,
	hip: true,
	wrist: true,
	knee: true,
	ankle: true
};

var rings = {
	arm: {
		radius: [2, 1],
		rotation: [45, 0, 0]
	}
};

for (var s in skeleton) {
	var pos = skeleton[s];

	// var sphere = new THREE.Mesh( jointGeometry, skeletonMaterial ); 
	// scene.add( sphere ); 
	// sphere.position.x = pos[0];
	// sphere.position.y = pos[1];
	// sphere.position.z = pos[2];

	// if (mirror[s]) {
	// 	var mirrorSphere = new THREE.Mesh( jointGeometry, skeletonMaterial ); 
	// 	scene.add( mirrorSphere ); 
	// 	mirrorSphere.position.x = -pos[0];
	// 	mirrorSphere.position.y = pos[1];
	// 	mirrorSphere.position.z = pos[2];
	// }
}

function createTorso() {
	var startWidth = skeleton.clavicle[0];
	var startDepth = 1;
	var endWidth = skeleton.hip[0];
	var endDepth = 1;

	var fnX = function(ri, ti) {
		return Math.cos(ti * Math.PI * 2) * interp(endWidth, startWidth, ri);
	};

	var fnZ = function(ri, ti) {
		return Math.sin(ti * Math.PI * 2) * interp(endDepth, startDepth, ri);
	};	

	var torsoGeometry = createParamTubeGeometry(fnX, fnZ, skeleton.clavicle[1] - skeleton.hip[1], 20, 20);
	var torso = new THREE.Mesh( torsoGeometry, skinMaterial );
	scene.add(torso);
	torso.position.x = 0;
	torso.position.y = skeleton.hip[1];
	torso.position.z = 0;
	return torso;
}

var torso = createTorso();
bodyShapes.push(torso);

camera.position.z = 30;

function render() { 
	stats.begin();
	requestAnimationFrame( render ); 
	renderer.render( scene, camera ); 
	stats.end();
	rendererStats.update(renderer);
} 

function closestVertex(vertices, face, point) {
	var dsq0 = vertices[face.a].distanceToSquared(point);
	var dsq1 = vertices[face.b].distanceToSquared(point);
	var dsq2 = vertices[face.c].distanceToSquared(point);

	var tvIndex;
	if (dsq0 <= dsq1 && dsq0 <= dsq2) tvIndex = face.a;
	else if (dsq1 <= dsq0 && dsq1 <= dsq2) tvIndex = face.b;
	else tvIndex = face.c;
	return tvIndex;
}

$(function() {

	var mObject;
	var mvIndex;
	var mouseVector = new THREE.Vector3();
	var mdownX, mdownY;
	var mouseDelta = new THREE.Vector3();
	var mRing;

	var distortionRadius = 10;
	var distortionLast = 0;

	$("body").mousedown(function(event) {
		mouseVector.set( ( event.clientX / containerWidth ) * 2 - 1, 
			- ( event.clientY / containerHeight ) * 2 + 1, 0.5 );
    	mouseVector.unproject( camera );
    	raycaster.set( camera.position, mouseVector.sub( camera.position ).normalize() );
		var intersects = raycaster.intersectObjects( bodyShapes );
		// Change color if hit block
		if ( intersects.length > 0 ) {

			console.log("object");

			mdownX = event.clientX;
			mdownY = event.clientY;

			var intersect = intersects[0];
			var point = intersect.point;
			var face = intersect.face;
			var object = intersect.object;
			var vertices = object.geometry.vertices;

			var tvIndex = closestVertex(vertices, face, point);
			var tvertex = vertices[tvIndex];

			mObject = object;
			mvIndex = tvIndex;

			mRing = Math.floor(mvIndex / mObject.geometry.tsegs);
		}
	});

	$("body").mousemove(function(event) {
		if (mObject) {
			mouseDelta.set(event.clientX - mdownX, event.clientY - mdownY, 0);

			var objUp = new THREE.Vector3(0, 1, 0);
			objUp.applyQuaternion(mObject.quaternion);

			var mvProj = new THREE.Vector3();
			mvProj.crossVectors(objUp, mouseDelta);
			var distortion = mvProj.length() * -Math.sign(mvProj.z);

			mObject.geometry.distort(mRing, 3, (distortion - distortionLast) / 100);
			mObject.geometry.verticesNeedUpdate = true;

			distortionLast = distortion;
		}
	});

	$("body").mouseup(function(event) {
		mObject = undefined;
		distortionLast = 0;
	});

});

// controls.addEventListener( 'change', render );

render();