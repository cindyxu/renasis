var GRID_ROWS = 10;
var GRID_COLS = 10;
var GRID_TILE_HYP = 7;

var GRID_OFFSET_X = 0;
var WALL_HEIGHT_RAW = 44;

var SELECT_THUMB_SPACING_SCALED = 4;
var SELECT_THUMB_SIZE_SCALED = 48;
var SELECT_ROWS = 2;
var SELECT_COLS = 5;
var SELECT_MARGIN_TOP_SCALED = 40;
var DRAG_ITEM_HEIGHT = 14;

var SCALE = 2;

$(function() {
	var canvas = document.getElementById("customize-room");
	var ctx = canvas.getContext("2d");
	var offset = $(canvas).parent().offset();

	var furnitureContainer = $("#furniture-container");

	var tileHeight = (GRID_TILE_HYP * 2 - 2);
	var tileWidth = ((GRID_TILE_HYP * 2 - 2) * 2);

	var selectWidthScaled = SELECT_COLS * (SELECT_THUMB_SPACING_SCALED*2 + SELECT_THUMB_SIZE_SCALED);
	var selectHeightScaled = SELECT_ROWS * (SELECT_THUMB_SPACING_SCALED*2 + SELECT_THUMB_SIZE_SCALED);

	var gridOriginYRaw = (GRID_TILE_HYP-1) * GRID_ROWS + 1 + WALL_HEIGHT_RAW;
	var gridOriginXRaw = GRID_OFFSET_X;

	var gridWidthScaled = (2 + (GRID_ROWS + GRID_COLS) * tileWidth/2 + GRID_OFFSET_X) * SCALE;
	var gridHeightScaled = ((GRID_ROWS + GRID_COLS) * tileHeight/2 + 2 + WALL_HEIGHT_RAW) * SCALE;

	var canvasRoom = $('<canvas id="customize-room" width=' + gridWidthScaled + ' height=' + gridHeightScaled + '>')[0];
	var ctxRoom = canvasRoom.getContext("2d");

	var canvasBase = $('<canvas id="room-base" width=' + gridWidthScaled + ' height=' + gridHeightScaled + '>')[0];
	var ctxBase = canvasBase.getContext("2d");

	var canvasGrid = $('<canvas id="customize-room" width=' + gridWidthScaled + ' height=' + gridHeightScaled + '>')[0];
	var ctxGrid = canvasGrid.getContext("2d");

	var canvasSelect = $('<canvas id="furniture-selection" width=' + selectWidthScaled + ' height=' + selectHeightScaled + '>')[0];
	var ctxSelect = canvasSelect.getContext("2d");

	var canvasSelectedTile = $('<canvas id="selected-tile" width=' + ((GRID_TILE_HYP*2-1)*2-2)*SCALE + ' height=' + (GRID_TILE_HYP*2-1)*SCALE + '>')[0];
	var ctxSelectedTile = canvasSelectedTile.getContext("2d");

	// this is to scale b/c images are already to scale
	var canvasColormap = $('<canvas id="customize-room" width=' + gridWidthScaled + ' height=' + gridHeightScaled + '>')[0];
	var ctxColormap = canvasColormap.getContext("2d");

	var pdataColormap;

	var roomOffsetXScaled = canvas.width/2 - gridWidthScaled/2;
	var roomOffsetYScaled = 0;

	var selectOffsetXScaled = canvas.width/2 - selectWidthScaled/2;
	var selectOffsetYScaled = roomOffsetYScaled + gridHeightScaled + SELECT_MARGIN_TOP_SCALED + furnitureContainer.outerHeight();

	var selectFurniture = [];
	
	var gridFurniture = [];
	var gridFurnitureTiles = [];
	
	var wallFurniture = [];

	var hoverGridTile;
	var hoverGridTilePosScaled;

	var hoverSelectFurnitureIdx;

	var dragFurniture;
	var dragOffsetXScaled, dragOffsetYScaled;

	var roomFloor;
	var roomWall;

	var mx, my;

	var drawGridTileToPixels = function(r, c, tx, ty, pdata, w, h, sl) {
		for (var k = 0; k < 4; k++) {
			for (var j = 0; j < GRID_TILE_HYP; j++) {
				var py;
				if (k === 0 || k === 1) py = ty + (GRID_TILE_HYP-1 - j) * SCALE;
				else py = ty + (GRID_TILE_HYP-1 + j) * SCALE;

				var i, px, po;

				// edges
				for (i = j*2; i < j*2+2; i++) {
					if (k === 0 || k === 2) px = tx-SCALE + i * SCALE;
					else px = tx-SCALE + (tileWidth+1 - i) * SCALE;

					if (!sl) drawScaledPixel(px, py, pdata, w, h, SCALE, 0, 0, 0, 255);
				}

				// fill
				if (sl) {
					for (i = j*2+2; i < tileWidth/2 + 1; i++) {
						if (k === 0 || k === 2) px = tx-SCALE + i * SCALE;
						else px = tx-SCALE + (tileWidth+1 - i) * SCALE;

						drawScaledPixel(px, py, pdata, w, h, SCALE, 255, 255, 0, 255);
					}
				}
			}
		}
	};

	var drawScaledPixel = function(px, py, pdata, w, h, sc, rf, gf, bf, af) {
		var po;
		for (var j = 0; j < sc; j++) {
			for (var i = 0; i < sc; i++) {
				po = (w * (py+j) + (px+i)) * 4;
				pdata[po] = rf;
				pdata[po+1] = gf;
				pdata[po+2] = bf;
				pdata[po+3] = af;
			}
		}
	};

	var posScaledToGridTile = function(px, py) {
		var dx = ((px/SCALE) - gridOriginXRaw);
		var dy = (gridOriginYRaw - (py/SCALE));
		var r = Math.floor(dx / tileWidth + dy / tileHeight);
		var c = Math.floor(dx / tileWidth - dy / tileHeight);
		return [r, c];
	};

	var gridTileToPosScaled = function(r, c) {
		return [(gridOriginXRaw + tileWidth/2 * (r + c) + 1) * SCALE,
		((gridOriginYRaw - (GRID_TILE_HYP-1) * (r - c)) - GRID_TILE_HYP) * SCALE];
	};

	var gridTileInRange = function(r, c) {
		return r >= 0 && c >= 0 && r < GRID_ROWS && c < GRID_COLS;
	};

	var isValidFurniturePosition = function(furniture, r, c) {
		if (furniture.baseTiles) {
			for (var i = 0; i < furniture.baseRows; i++) {
				for (var j = 0; j < furniture.baseCols; j++) {
					var underTileIdx = i * furniture.baseCols + j;
					if (furniture.baseTiles[underTileIdx] && !gridTileInRange(r + i, c + j)) {
						return false;
					}
					if (gridFurnitureTiles[(r+i) * GRID_COLS + (c+j)]) {
						return false;
					}
				}
			}
		}
		return true;
	};

	var drawAll = function() {
		ctx.clearRect(0, 0, canvas.width, canvas.height);
		ctx.drawImage(canvasBase, roomOffsetXScaled, roomOffsetYScaled);
		ctx.drawImage(canvasGrid, roomOffsetXScaled, roomOffsetYScaled);
		if (dragFurniture) drawDragFurnitureHighlight();
		else if (hoverGridTile && gridTileInRange(hoverGridTile[0], hoverGridTile[1])) {
			ctx.drawImage(canvasSelectedTile, roomOffsetXScaled + hoverGridTilePosScaled[0], roomOffsetYScaled + hoverGridTilePosScaled[1]);
		}
		for (var i = 0; i < gridFurniture.length; i++) {
			drawFurnitureInRoom(gridFurniture[i]);
		}
		ctx.drawImage(canvasSelect, selectOffsetXScaled, selectOffsetYScaled);
		drawDragFurniture();
	};

	var drawHighlightRectInSelection = function(r, c) {
		ctxSelect.save();
		ctxSelect.fillStyle = "yellow";
		ctxSelect.fillRect(c * (SELECT_THUMB_SIZE_SCALED + SELECT_THUMB_SPACING_SCALED * 2),
			r * (SELECT_THUMB_SIZE_SCALED + SELECT_THUMB_SPACING_SCALED * 2), 
			SELECT_THUMB_SIZE_SCALED + SELECT_THUMB_SPACING_SCALED * 2,
			SELECT_THUMB_SIZE_SCALED + SELECT_THUMB_SPACING_SCALED * 2);
		ctxSelect.restore();
	};

	var drawFurnitureInSelection = function(i) {
		ctxSelect.drawImage(selectFurniture[i].thumb, 
			(SELECT_THUMB_SIZE_SCALED + SELECT_THUMB_SPACING_SCALED*2) * (i % SELECT_COLS) + SELECT_THUMB_SPACING_SCALED, 
			(SELECT_THUMB_SIZE_SCALED + SELECT_THUMB_SPACING_SCALED*2) * Math.floor(i / SELECT_COLS) + SELECT_THUMB_SPACING_SCALED);
	};

	var mousemoveRoom = function(e, px, py) {
		hoverGridTile = posScaledToGridTile(px, py);
		hoverGridTilePosScaled = gridTileToPosScaled(hoverGridTile[0], hoverGridTile[1]);
		drawAll();
	};

	var mousemoveSelect = function(e, px, py) {
		var nhidx = posToSelectFurnitureIdx(px, py);
		var redraw = (nhidx !== hoverSelectFurnitureIdx);
		hoverSelectFurnitureIdx = nhidx;

		if (redraw) {
			drawSelect();
		}
	};

	var mousedownRoom = function(e, px, py) {
		var colorOrig = Math.floor(py * canvasColormap.width + px) * 4;
		var idx = pdataColormap[colorOrig]*65025 + pdataColormap[colorOrig+1]*255 + pdataColormap[colorOrig+2];
		if (idx >= 0 && idx < gridFurniture.length) {
			dragFurniture = removeFurnitureFromRoom(idx);
			drawColormap();
		}
	};

	var removeFurnitureFromRoom = function(idx) {
		removeFurniture = gridFurniture.splice(idx, 1)[0];
		for (var i = 0; i < removeFurniture.baseRows; i++) {
			for (var j = 0; j < removeFurniture.baseCols; j++) {
				var r = removeFurniture.gridRow+i;
				var c = removeFurniture.gridCol+j;
				gridFurnitureTiles[r * GRID_COLS + c] = undefined;
			}
		}
		return removeFurniture;
	};

	var mousedownSelect = function(e, px, py) {
		if (hoverSelectFurnitureIdx >= 0) {
			dragFurniture = selectFurniture[hoverSelectFurnitureIdx];
			var image = (dragFurniture.baseTiles ? dragFurniture.images[0] : dragFurniture.thumb);
			dragOffsetXScaled = Math.floor(image.width/2);
			dragOffsetYScaled = Math.floor(image.height/2);
		}
	};

	var drawDragFurnitureHighlight = function() {
		ctx.save();
		if (!dragFurniture || !dragFurniture.baseTiles) return;
		var underTileOrig = posScaledToGridTile(Math.floor(mx - roomOffsetXScaled - dragOffsetXScaled + (dragFurniture.baseOffsetX + tileWidth/2) * SCALE), 
			Math.floor(my - roomOffsetYScaled - dragOffsetYScaled + (dragFurniture.baseOffsetY + tileHeight/2) * SCALE));
		for (var j = 0; j < dragFurniture.baseRows; j++) {
			for (var i = 0; i < dragFurniture.baseCols; i++) {
				var underTileIdx = j * dragFurniture.baseCols + i;
				if (dragFurniture.baseTiles[underTileIdx]) {
					var tpos = gridTileToPosScaled(underTileOrig[0] + i, underTileOrig[1] + j);
					ctx.drawImage(canvasSelectedTile, tpos[0] + roomOffsetXScaled, tpos[1] + roomOffsetYScaled);
				}
			}
		}
	};

	var resolveFurnitureOrdering = function() {
		gridFurniture = [];
		var inOrdering = {};
		var c, r, dx, dy, rf;

		for (dy = GRID_ROWS-1; dy >= 0; dy--) {
			for (dx = 0; dx < Math.min(GRID_COLS, GRID_ROWS - dy); dx++) {
				c = dx;
				r = dy + dx;
				rf = gridFurnitureTiles[r * GRID_COLS + c];
				if (rf && !inOrdering[rf.itemName]) {
					inOrdering[rf.itemName] = true;
					gridFurniture.push(rf);
				}
			}
		}

		for (dy = 1; dy < GRID_COLS; dy++) {
			for (dx = 0; dx < Math.min(GRID_ROWS, GRID_COLS - dy); dx++) {
				r = dx;
				c = dy + dx;
				rf = gridFurnitureTiles[r * GRID_COLS + c];
				if (rf && !inOrdering[rf.itemName]) {
					inOrdering[rf.itemName] = true;
					gridFurniture.push(rf);
				}
			}
		}
	};

	var dropFurnitureInRoom = function() {
		if (dragFurniture.subcategory === "floor") {
			roomFloor = dragFurniture;
			initFloor();
		} else if (dragFurniture.subcategory === "wall") {
			roomWall = dragFurniture;
			initWall();
		} else {
			var underTileOrig = posScaledToGridTile(Math.floor(mx - roomOffsetXScaled - dragOffsetXScaled + (dragFurniture.baseOffsetX + tileWidth/2) * SCALE), 
			Math.floor(my - roomOffsetYScaled - dragOffsetYScaled + (dragFurniture.baseOffsetY + tileHeight/2) * SCALE));
			if (!isValidFurniturePosition(dragFurniture, underTileOrig[0], underTileOrig[1])) return;
			var addRoomFurniture = $.extend({}, dragFurniture);
			addRoomFurniture.gridRow = underTileOrig[0];
			addRoomFurniture.gridCol = underTileOrig[1];

			for (var i = 0; i < addRoomFurniture.baseRows; i++) {
				for (var j = 0; j < addRoomFurniture.baseCols; j++) {
					var r = addRoomFurniture.gridRow+i;
					var c = addRoomFurniture.gridCol+j;
					gridFurnitureTiles[r * GRID_COLS + c] = addRoomFurniture;
				}
			}

			resolveFurnitureOrdering();
			drawColormap();
		}
	};

	// this will fail if you have more than 65025 items in your room. LOL!
	var drawColormap = function() {
		ctxColormap.save();
		ctxColormap.fillStyle = "white";
		ctxColormap.fillRect(0, 0, canvasColormap.width, canvasColormap.height);
		for (var i = 0; i < gridFurniture.length; i++) {
			var ri = gridFurniture[i];
			var tpos = gridTileToPosScaled(ri.gridRow, ri.gridCol);
			var px = tpos[0] - ri.baseOffsetX * SCALE;
			var py = tpos[1] - ri.baseOffsetY * SCALE;
			ctxColormap.globalCompositeOperation = "xor";
			ctxColormap.drawImage(ri.images[0], px, py);
			ctxColormap.globalCompositeOperation = "destination-over";
			ctxColormap.fillStyle = "rgba(" + Math.floor(i/65025) + "," + Math.floor((i/(255)) % 255) + "," + (i % 255) + ", 255)";
			ctxColormap.fillRect(px, py, ri.images[0].width, ri.images[0].height);
		}
		ctxColormap.restore();
		pdataColormap = ctxColormap.getImageData(0, 0, canvasColormap.width, canvasColormap.height).data;
	};

	var drawDragFurniture = function() {
		if (!dragFurniture) return;
		if (dragFurniture.baseTiles) {
			ctx.drawImage(dragFurniture.images[0], 
					Math.floor(mx - dragOffsetXScaled), 
					Math.floor(my - DRAG_ITEM_HEIGHT*SCALE - dragOffsetYScaled));
		} else {
			ctx.drawImage(dragFurniture.thumb, 
					Math.floor(mx - dragOffsetXScaled), 
					Math.floor(my - dragOffsetYScaled));
		}
	};

	var mouseupRoom = function(e, px, py) {
	};

	var mouseupSelect = function(e, px, py) {
	};

	var inSelectCanvas = function(px, py) {
		return px >= selectOffsetXScaled && px < selectOffsetXScaled + selectWidthScaled &&
			py >= selectOffsetYScaled && py < selectOffsetYScaled + selectHeightScaled;
	};

	var inRoomCanvas = function(px, py) {
		return px >= roomOffsetXScaled && px < roomOffsetXScaled + gridWidthScaled &&
			py >= roomOffsetYScaled && py < roomOffsetYScaled + gridHeightScaled;
	};

	var initGrid = function() {
		var imageData = ctxGrid.getImageData(0, 0, canvasGrid.width, canvasGrid.height);
		var pdata = imageData.data;
		for (var j = 0; j < GRID_COLS; j++) {
			for (var i = 0; i < GRID_ROWS; i++) {
				var tpos = gridTileToPosScaled(i, j);
				drawGridTileToPixels(i, j, tpos[0], tpos[1], pdata, canvasGrid.width, canvasGrid.height);
			}
		}
		ctxGrid.putImageData(imageData, 0, 0);
	};

	var initBase = function() {
		ctxBase.clearRect(0, 0, gridWidthScaled, gridHeightScaled);
		initWall();
		initFloor();
	};

	var initFloor = function() {
		if (!roomFloor) return;
		for (var r = 0; r < GRID_ROWS; r++) {
			for (var c = 0; c < GRID_COLS; c++) {
				var fr = r % roomFloor.baseRows;
				var fc = c % roomFloor.baseCols;
				var fimg = roomFloor.images[fr * roomFloor.baseCols + fc];
				var gps = gridTileToPosScaled(r, c);
				var gx = gps[0];
				var gy = gps[1];
				ctxBase.drawImage(fimg, 
					(gx - roomFloor.baseOffsetX * SCALE), 
					(gy - roomFloor.baseOffsetY * SCALE));
			}
		}
	};

	var initWall = function() {
		if (!roomWall) return;
		ctxBase.save();

		var c, r, wr, wimg, gps, gx, gy;
		for (r = GRID_ROWS-1; r >= 0; r--) {
			wr = roomWall.baseCols - 1 - ((GRID_ROWS - 1 - r) % roomWall.baseCols);
			wimg = roomWall.images[wr];
			gps = gridTileToPosScaled(r, 0);
			gx = gps[0];
			gy = gps[1] - (WALL_HEIGHT_RAW - 1) * SCALE;
			ctxBase.drawImage(wimg,
				(gx - roomWall.baseOffsetX),
				(gy - roomWall.baseOffsetY));
		}
		for (c = 0; c < GRID_COLS; c++) {
			wc = c % roomWall.baseCols;
			wimg = roomWall.images[wc + roomWall.baseCols];
			gps = gridTileToPosScaled(GRID_ROWS-1, c);
			gx = gps[0] + (tileWidth/2) * SCALE;
			gy = gps[1] - (WALL_HEIGHT_RAW - 1) * SCALE;
			ctxBase.drawImage(wimg,
				(gx - roomWall.baseOffsetX),
				(gy - roomWall.baseOffsetY));
		}
		ctxBase.restore();
	};

	var posToSelectFurnitureIdx = function(px, py) {
		var r = Math.floor(py / (SELECT_THUMB_SIZE_SCALED+SELECT_THUMB_SPACING_SCALED*2));
		var c = Math.floor(px / (SELECT_THUMB_SIZE_SCALED+SELECT_THUMB_SPACING_SCALED*2));
		if (r < 0 || r >= GRID_ROWS || c < 0 || c >= GRID_COLS || (r*GRID_COLS+c) >= selectFurniture.length) return -1;
		return r*SELECT_COLS+c;
	};

	var drawSelect = function() {
		ctxSelect.save();
		ctxSelect.fillStyle = "white";
		ctxSelect.fillRect(0, 0, canvasSelect.width, canvasSelect.height);
		if (hoverSelectFurnitureIdx >= 0) {
			drawHighlightRectInSelection(
				Math.floor(hoverSelectFurnitureIdx / SELECT_COLS), 
				Math.floor(hoverSelectFurnitureIdx % SELECT_COLS));
		}
		for (var i = 0; i < selectFurniture.length; i++) {
			drawFurnitureInSelection(i);	
		}
		ctxSelect.restore();
	};

	var initSelectedTile = function() {
		var imageData = ctxSelectedTile.getImageData(0, 0, canvasSelectedTile.width, canvasSelectedTile.height);
		var pdata = imageData.data;
		drawGridTileToPixels(0, 0, 0, 0, pdata, canvasSelectedTile.width, canvasSelectedTile.height, true);
		ctxSelectedTile.putImageData(imageData, 0, 0);
	};

	var drawFurnitureInRoom = function(furniture) {
		var fp = gridTileToPosScaled(furniture.gridRow, furniture.gridCol);
		ctx.drawImage(furniture.images[0], fp[0] - furniture.baseOffsetX*SCALE + roomOffsetXScaled, fp[1] - furniture.baseOffsetY*SCALE + roomOffsetYScaled);
	};

	var gatherFurnitureSelection = function() {
		var furnitureElements = $(".select-furniture");
		$.each(furnitureElements, function(i, fel) {
			var $fel = $(fel);
			var fobj = {
				"thumb" : $fel.children(".furniture-thumb")[0],
				"images" : $fel.children(".furniture-image").toArray(),
				"itemId" : $fel.attr("data-item-id"),
				"itemName" : $fel.attr("data-item-name"),
				"itemAlias" : $fel.attr("data-item-alias"),
				"subcategory" : $fel.attr("data-item-subcategory"),
				"baseOffsetX" : parseInt($fel.attr("data-base-offset-x")),
				"baseOffsetY" : parseInt($fel.attr("data-base-offset-y")),
				"baseRows" : parseInt($fel.attr("data-base-rows")),
				"baseCols" : parseInt($fel.attr("data-base-cols")),
				"baseTiles" : ($fel.attr("data-base-tiles-bits") ? 
					$.map(parseInt($fel.attr("data-base-tiles-bits")).toString(2).split(""), 
						function(n, i) { return parseInt(n); }) 
					: undefined)
			};
			selectFurniture.push(fobj);
		});
	};

	$(canvas).mousemove(function(e) {
		var offset = $(this).offset();
		mx = e.pageX - offset.left;
		my = e.pageY - offset.top;

		if (inSelectCanvas(mx, my)) mousemoveSelect(e, mx - selectOffsetXScaled, my - selectOffsetYScaled);
		else if (inRoomCanvas(mx, my)) mousemoveRoom(e, mx - roomOffsetXScaled, my - roomOffsetYScaled);

		drawAll();
	});

	$(canvas).mousedown(function(e) {
		var offset = $(this).offset();
		mx = e.pageX - offset.left;
		my = e.pageY - offset.top;

		if (inSelectCanvas(mx, my)) mousedownSelect(e, mx - selectOffsetXScaled, my - selectOffsetYScaled);
		else if (inRoomCanvas(mx, my)) mousedownRoom(e, mx - roomOffsetXScaled, my - roomOffsetYScaled);

		drawAll();
	});

	$(canvas).mouseup(function(e) {
		var offset = $(this).offset();
		mx = e.pageX - offset.left;
		my = e.pageY - offset.top;

		if (dragFurniture) dropFurnitureInRoom();
		else if (inSelectCanvas(mx, my)) mouseupSelect(e, mx - selectOffsetXScaled, my - selectOffsetYScaled);
		else if (inRoomCanvas(mx, my)) mouseupRoom(e, mx - roomOffsetXScaled, my - roomOffsetYScaled);
		dragFurniture = undefined;

		drawAll();
	});

	furnitureContainer.css("bottom", 600 - (selectOffsetYScaled + selectHeightScaled) - parseInt(furnitureContainer.css("padding-bottom")) + "px");
	furnitureContainer.css("left", (selectOffsetXScaled - parseInt(furnitureContainer.css("padding-left"))) + "px");
	furnitureContainer.css("width", selectWidthScaled + "px");
	furnitureContainer.css("height", furnitureContainer.height() + selectHeightScaled + "px");

	initBase();
	initGrid();
	initSelectedTile();
	gatherFurnitureSelection();
	drawSelect();
	drawColormap();

	drawAll();

});