var GRID_ROWS = 10;
var GRID_COLS = 10;
var GRID_TILE_HYP = 7;

var GRID_OFFSET_X = 0;
var WALL_HEIGHT_RAW = 44;

var DRAG_ITEM_HEIGHT = 14;

var SCALE = 2;

$(function() {
	var canvas = document.getElementById("customize-room");
	var ctx = canvas.getContext("2d");
	var offset = $(canvas).offset();

	var furnitureContainer = $("#furniture-container");

	var tileHeightRaw = (GRID_TILE_HYP * 2 - 2);
	var tileWidthRaw = ((GRID_TILE_HYP * 2 - 2) * 2);

	var gridOriginYRaw = (GRID_TILE_HYP-1) * GRID_ROWS + 1 + WALL_HEIGHT_RAW;
	var gridOriginXRaw = GRID_OFFSET_X;

	var gridWidthScaled = (2 + (GRID_ROWS + GRID_COLS) * tileWidthRaw/2 + GRID_OFFSET_X) * SCALE;
	var gridHeightScaled = ((GRID_ROWS + GRID_COLS) * tileHeightRaw/2 + 2 + WALL_HEIGHT_RAW) * SCALE;

	var canvasRoom = $('<canvas id="customize-room" width=' + gridWidthScaled + ' height=' + gridHeightScaled + '>')[0];
	var ctxRoom = canvasRoom.getContext("2d");

	var canvasBase = $('<canvas id="room-base" width=' + gridWidthScaled + ' height=' + gridHeightScaled + '>')[0];
	var ctxBase = canvasBase.getContext("2d");

	var canvasGrid = $('<canvas id="customize-room" width=' + gridWidthScaled + ' height=' + gridHeightScaled + '>')[0];
	var ctxGrid = canvasGrid.getContext("2d");                                                 

	var canvasSelectedTile = $('<canvas id="selected-tile" width=' + ((GRID_TILE_HYP*2-1)*2-2)*SCALE + ' height=' + (GRID_TILE_HYP*2-1)*SCALE + '>')[0];
	var ctxSelectedTile = canvasSelectedTile.getContext("2d");

	var imageSelectedWall = $("#wall-selected")[0];

	// this is to scale b/c images are already to scale
	var canvasColormap = $('<canvas id="customize-room" width=' + gridWidthScaled + ' height=' + gridHeightScaled + '>')[0];
	var ctxColormap = canvasColormap.getContext("2d");

	var pdataColormap;

	var roomOffsetXScaled = canvas.width/2 - gridWidthScaled/2;
	var roomOffsetYScaled = 0;

	var gridFurniture = [];
	var gridFurnitureTiles = [];
	
	var wallFurnitureLeft = [];
	var wallFurnitureRight = [];
	var wallFurnitureUnique = [];

	var hoverGridTile;
	var hoverGridTilePosScaled;

	var dragFurniture;
	var dragFurnitureImg;
	var dragOffsetXScaled, dragOffsetYScaled;

	var roomFloor;
	var roomWallpaper;

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
					else px = tx-SCALE + (tileWidthRaw+1 - i) * SCALE;

					if (!sl) drawScaledPixel(px, py, pdata, w, h, SCALE, 0, 0, 0, 255);
				}

				// fill
				if (sl) {
					for (i = j*2+2; i < tileWidthRaw/2 + 1; i++) {
						if (k === 0 || k === 2) px = tx-SCALE + i * SCALE;
						else px = tx-SCALE + (tileWidthRaw+1 - i) * SCALE;

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
		var r = Math.floor(dx / tileWidthRaw + dy / tileHeightRaw);
		var c = Math.floor(dx / tileWidthRaw - dy / tileHeightRaw);
		return [r, c];
	};

	var furniturePosScaledToWallTile = function(furniture, px, py) {
		var dxs = px - gridOriginXRaw * SCALE;
		var dys = py - gridOriginYRaw * SCALE;

		if (dxs < GRID_ROWS * tileWidthRaw * SCALE / 2) {
			return [-1, Math.floor(dxs / (tileWidthRaw * SCALE / 2))];
		} else {
			return [1, Math.floor((gridWidthScaled - (dxs + $(furniture.images[0]).width())) / (tileWidthRaw * SCALE / 2))];
		}
	};

	var gridTileToPosScaled = function(r, c) {
		return [(gridOriginXRaw + tileWidthRaw/2 * (r + c) + 1) * SCALE,
		((gridOriginYRaw - (GRID_TILE_HYP-1) * (r - c)) - GRID_TILE_HYP) * SCALE];
	};

	var wallTileToPosScaled = function(wallSide, wallCol, hilo) {
		var px, py;
		if (wallSide < 0) px = (gridOriginXRaw + tileWidthRaw/2 * wallCol) * SCALE;
		else px = (gridOriginXRaw - tileWidthRaw/2 * wallCol) * SCALE + gridWidthScaled;
		py = (gridOriginYRaw - tileHeightRaw/2 * (wallCol + (hilo ? 1 : 0)) - WALL_HEIGHT_RAW) * SCALE;
		return [px, py];
	};

	var wallFurnitureToPosScaled = function(furniture, wallSide, wallCol) {
		if (wallSide === undefined) wallSide = furniture.wallSide;
		if (wallCol === undefined) wallCol = furniture.wallCol;
		if (wallSide < 0) {
			return [(gridOriginXRaw + tileWidthRaw/2 * wallCol + 1 + furniture.baseOffsetX) * SCALE,
			(gridOriginYRaw - tileHeightRaw/2 * wallCol - WALL_HEIGHT_RAW + furniture.baseOffsetY) * SCALE];
		} else {
			return [(gridOriginXRaw - tileWidthRaw/2 * wallCol - furniture.baseOffsetX) * SCALE + gridWidthScaled,
			(gridOriginYRaw - tileHeightRaw/2 * wallCol - WALL_HEIGHT_RAW + furniture.baseOffsetY) * SCALE];
		}
	};

	var gridTileInRange = function(r, c) {
		return r >= 0 && c >= 0 && r < GRID_ROWS && c < GRID_COLS;
	};

	var isValidFloorPosition = function(furniture, r, c) {
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
		return true;
	};

	var isValidWallPosition = function(furniture, s, w) {
		var i;
		if (s < 0) {
			for (i = w; i < w + furniture.gridCols; i++) {
				if (i < 0 || i >= GRID_ROWS) return false;
				if (wallFurnitureLeft[i]) return false;
			}
			
		} else {
			for (i = w; i < w + furniture.gridCols; i++) {
				if (i < 0 || i >= GRID_COLS) return false;
				if (wallFurnitureRight[i]) return false;
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
			ctx.drawImage(canvasSelectedTile, 
				roomOffsetXScaled + hoverGridTilePosScaled[0], 
				roomOffsetYScaled + hoverGridTilePosScaled[1]);
		}
		for (var w = 0; w < wallFurnitureUnique.length; w++) {
			drawFurnitureOnWall(wallFurnitureUnique[w]);
		}
		for (var i = 0; i < gridFurniture.length; i++) {
			drawFurnitureOnFloor(gridFurniture[i]);
		}
	};

	var mousemoveRoom = function(e, px, py) {
		hoverGridTile = posScaledToGridTile(px, py);
		hoverGridTilePosScaled = gridTileToPosScaled(hoverGridTile[0], hoverGridTile[1]);
		drawAll();
	};

	var mousedownRoom = function(e, px, py) {
		var colorOrig = Math.floor(py * canvasColormap.width + px) * 4;
		var idx = pdataColormap[colorOrig]*65025 + pdataColormap[colorOrig+1]*255 + pdataColormap[colorOrig+2];
		if (idx >= 0 && idx < gridFurniture.length) {
			setDragFurniture(removeFurnitureFromRoom(idx));
			drawColormap();
		}
	};

	var setDragFurniture = function(df) {
		dragFurniture = df;
		dragFurnitureImg = (dragFurniture.subcategory !== "wallpaper" && dragFurniture.subcategory !== "floor" ? 
			$(dragFurniture.images[0]).clone() : $(dragFurniture.thumb).clone());
		dragFurnitureImg.css("position", "fixed");
		
		$("body").append(dragFurnitureImg);

		dragOffsetXScaled = dragFurnitureImg.width() / 2;
		dragOffsetYScaled = dragFurnitureImg.height() / 2;

		$("body").mouseup(function(e) {
			mx = e.pageX;
			my = e.pageY;
			if (mx - offset.left >= roomOffsetXScaled && mx - offset.left < roomOffsetXScaled + gridWidthScaled &&
				my - offset.top >= roomOffsetYScaled && my - offset.top < roomOffsetYScaled + gridHeightScaled) {
				dropFurnitureInRoom();
			}
			dragFurniture = undefined;
			dragFurnitureImg.remove();
			dragFurnitureImg = undefined;
			drawAll();
			
			$("body").off("mouseup");
		});
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

	var drawDragFurnitureHighlight = function() {
		ctx.save();
		if (!dragFurniture) return;
		var underTileOrig, i, j, underTileIdx, tpos;
		if (!dragFurniture.baseTiles) {
			if (dragFurniture.subcategory === "wall") {
				underTileOrig = furniturePosScaledToWallTile(dragFurniture, Math.floor(mx - offset.left - roomOffsetXScaled - dragOffsetXScaled + dragFurniture.baseOffsetX * SCALE), 
					Math.floor(my - offset.top - roomOffsetYScaled - dragOffsetYScaled + dragFurniture.baseOffsetY * SCALE));
				if (underTileOrig[0] === -1) {
					for (i = 0; i < dragFurniture.baseCols; i++) {
						tpos = wallTileToPosScaled(underTileOrig[0], underTileOrig[1] + i, true);
						ctx.drawImage(imageSelectedWall, tpos[0] + roomOffsetXScaled, tpos[1] + roomOffsetYScaled);
					}
				} else {
					ctx.save();
					ctx.scale(-1, 1);
					ctx.translate(-canvas.width, 0);
					for (i = 0; i < dragFurniture.baseCols; i++) {
						tpos = wallTileToPosScaled(underTileOrig[0], underTileOrig[1] + i, true);
						ctx.drawImage(imageSelectedWall, canvas.width - (tpos[0] + roomOffsetXScaled), tpos[1] + roomOffsetYScaled);
					}
					ctx.restore();
				}
			}
		} else {
			 underTileOrig = posScaledToGridTile(Math.floor(mx - offset.left - roomOffsetXScaled - dragOffsetXScaled + (dragFurniture.baseOffsetX + tileWidthRaw/2) * SCALE), 
				Math.floor(my - offset.top - roomOffsetYScaled - dragOffsetYScaled + (dragFurniture.baseOffsetY + tileHeightRaw/2) * SCALE));
			for (j = 0; j < dragFurniture.baseRows; j++) {
				for (i = 0; i < dragFurniture.baseCols; i++) {
					underTileIdx = j * dragFurniture.baseCols + i;
					if (dragFurniture.baseTiles[underTileIdx]) {
						tpos = gridTileToPosScaled(underTileOrig[0] + i, underTileOrig[1] + j);
						ctx.drawImage(canvasSelectedTile, tpos[0] + roomOffsetXScaled, tpos[1] + roomOffsetYScaled);
					}
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
		} else if (dragFurniture.subcategory === "wallpaper") {
			roomWallpaper = dragFurniture;
			initWallpaper();
		} else {
			var fx = Math.floor(mx - offset.left - roomOffsetXScaled - dragOffsetXScaled + dragFurniture.baseOffsetX * SCALE);
			var fy = Math.floor(my - offset.top - roomOffsetYScaled - dragOffsetYScaled + dragFurniture.baseOffsetY * SCALE);
			
			if (dragFurniture.subcategory === "wall") {
				var wallTileOrig = furniturePosScaledToWallTile(dragFurniture, fx, fy);
				console.log(wallTileOrig);
				if (!isValidWallPosition(dragFurniture, wallTileOrig[0], wallTileOrig[1])) return;

				dragFurniture.wallSide = wallTileOrig[0];
				dragFurniture.wallCol = wallTileOrig[1];

				var w;
				if (dragFurniture.wallSide < 0) {
					for (w = 0; w < dragFurniture.baseCols; w++) {
						wallFurnitureLeft[w + dragFurniture.wallCol] = dragFurniture;
					}
				} else {
					for (w = 0; w < dragFurniture.baseCols; w++) {
						wallFurnitureRight[w + dragFurniture.wallCol] = dragFurniture;
					}
				}
				wallFurnitureUnique.push(dragFurniture);
			} else {

				fx += tileWidthRaw/2 * SCALE;
				fy += tileHeightRaw/2 * SCALE;

				var underTileOrig = posScaledToGridTile(fx, fy);
				if (!isValidFloorPosition(dragFurniture, underTileOrig[0], underTileOrig[1])) return;
				dragFurniture.gridRow = underTileOrig[0];
				dragFurniture.gridCol = underTileOrig[1];

				for (var i = 0; i < dragFurniture.baseRows; i++) {
					for (var j = 0; j < dragFurniture.baseCols; j++) {
						var r = dragFurniture.gridRow+i;
						var c = dragFurniture.gridCol+j;
						gridFurnitureTiles[r * GRID_COLS + c] = dragFurniture;
					}
				}
				resolveFurnitureOrdering();
			}
			drawColormap();
		}
	};

	// this will fail if you have more than 65025 items in your room. LOL!
	var drawColormap = function() {
		ctxColormap.save();
		ctxColormap.fillStyle = "white";
		ctxColormap.fillRect(0, 0, canvasColormap.width, canvasColormap.height);

		var drawColormapForItem = function(item, tpos) {
			var px = tpos[0] - item.baseOffsetX * SCALE;
			var py = tpos[1] - item.baseOffsetY * SCALE;
			ctxColormap.globalCompositeOperation = "xor";
			ctxColormap.drawImage(item.images[0], px, py);
			ctxColormap.globalCompositeOperation = "destination-over";
			ctxColormap.fillStyle = "rgba(" + Math.floor(i/65025) + "," + Math.floor((i/(255)) % 255) + "," + (i % 255) + ", 255)";
			ctxColormap.fillRect(px, py, item.images[0].width, item.images[0].height);
		};

		var i, item, tpos;
		for (i = 0; i < wallFurnitureUnique.length; i++) {
			item = wallFurnitureUnique[i];
			if (!item) continue;
			tpos = wallFurnitureToPosScaled(item);
			drawColormapForItem(item, tpos);
		}

		for (i = 0; i < gridFurniture.length; i++) {
			item = gridFurniture[i];
			tpos = gridTileToPosScaled(item.gridRow, item.gridCol);
			drawColormapForItem(item, tpos);
		}

		ctxColormap.restore();
		pdataColormap = ctxColormap.getImageData(0, 0, canvasColormap.width, canvasColormap.height).data;
	};

	var mouseupRoom = function(e, px, py) {
	};

	var mouseupSelect = function(e, px, py) {
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
		initWallpaper();
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

	var initWallpaper = function() {
		if (!roomWallpaper) return;
		ctxBase.save();

		var c, r, wr, wimg, gps, gx, gy;
		for (r = GRID_ROWS-1; r >= 0; r--) {
			wr = roomWallpaper.baseCols - 1 - ((GRID_ROWS - 1 - r) % roomWallpaper.baseCols);
			wimg = roomWallpaper.images[wr];
			gps = gridTileToPosScaled(r, 0);
			gx = gps[0];
			gy = gps[1] - (WALL_HEIGHT_RAW - 1) * SCALE;
			ctxBase.drawImage(wimg,
				(gx - roomWallpaper.baseOffsetX),
				(gy - roomWallpaper.baseOffsetY));
		}
		for (c = 0; c < GRID_COLS; c++) {
			wc = c % roomWallpaper.baseCols;
			wimg = roomWallpaper.images[wc + roomWallpaper.baseCols];
			gps = gridTileToPosScaled(GRID_ROWS-1, c);
			gx = gps[0] + (tileWidthRaw/2) * SCALE;
			gy = gps[1] - (WALL_HEIGHT_RAW - 1) * SCALE;
			ctxBase.drawImage(wimg,
				(gx - roomWallpaper.baseOffsetX),
				(gy - roomWallpaper.baseOffsetY));
		}
		ctxBase.restore();
	};

	var initSelectedTile = function() {
		var imageData = ctxSelectedTile.getImageData(0, 0, canvasSelectedTile.width, canvasSelectedTile.height);
		var pdata = imageData.data;
		drawGridTileToPixels(0, 0, 0, 0, pdata, canvasSelectedTile.width, canvasSelectedTile.height, true);
		ctxSelectedTile.putImageData(imageData, 0, 0);
	};

	var drawFurnitureOnWall = function(furniture) {
		var fp = wallFurnitureToPosScaled(furniture);
		if (furniture.wallSide < 0) ctx.drawImage(furniture.images[0], fp[0] + roomOffsetXScaled, fp[1] + roomOffsetYScaled);
		else ctx.drawImage(furniture.images[0], fp[0] + roomOffsetXScaled - $(furniture.images[0]).width(), fp[1] + roomOffsetYScaled);
	};

	var drawFurnitureOnFloor = function(furniture) {
		var fp = gridTileToPosScaled(furniture.gridRow, furniture.gridCol);
		ctx.drawImage(furniture.images[0], fp[0] - furniture.baseOffsetX*SCALE + roomOffsetXScaled, fp[1] - furniture.baseOffsetY*SCALE + roomOffsetYScaled);
	};

	var moveDragFurniture = function(e) {
		dragFurnitureImg.css("left", (e.pageX - dragOffsetXScaled) + "px");
		dragFurnitureImg.css("top", (e.pageY - dragOffsetYScaled - DRAG_ITEM_HEIGHT) + "px");
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
			//selectFurniture.push(fobj);
		});
	};

	$("canvas").mousedown(function(e) {
		mx = e.pageX;
		my = e.pageY;
		if (mx - offset.left >= roomOffsetXScaled && mx - offset.left < roomOffsetXScaled + gridWidthScaled &&
			my - offset.top >= roomOffsetYScaled && my - offset.top < roomOffsetYScaled + gridHeightScaled) {
			mousedownRoom(e, mx - roomOffsetXScaled - offset.left, my - roomOffsetYScaled - offset.top);
		}
	});

	$("body").mousemove(function(e) {
		mx = e.pageX;
		my = e.pageY;
		if (dragFurniture) moveDragFurniture(e);
		if (mx - offset.left >= roomOffsetXScaled && mx - offset.left < roomOffsetXScaled + gridWidthScaled &&
			my - offset.top >= roomOffsetYScaled && my - offset.top < roomOffsetYScaled + gridHeightScaled) {
			mousemoveRoom(e, mx - roomOffsetXScaled - offset.left, my - roomOffsetYScaled - offset.top);
		}
		drawAll();
	});

	$(".furniture-thumb").mousedown(function(e) {
		e.preventDefault();
		var $fel = $(this).parent();
		var furniture = {
			"thumb" : this,
			"images" : $fel.find(".furniture-image").toArray(),
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
		setDragFurniture(furniture);
		moveDragFurniture(e);
	});

	initBase();
	initGrid();
	initSelectedTile();
	gatherFurnitureSelection();
	drawColormap();

	drawAll();

});