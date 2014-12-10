var GRID_ROWS = 10;
var GRID_COLS = 10;
var GRID_TILE_HYP = 7;

var GRID_OFFSET_X = 0;
var WALL_HEIGHT_RAW = 44;

var DRAG_ITEM_HEIGHT = 14;

var SCALE = 2;

var SHADOW_ALPHA = 0.3;
var HIGHLIGHT_ALPHA = 0.3;
var TRANSLUCENT_ALPHA = 0.5;

var SHADOW_PASS = 1 << 1;
var NORMAL_PASS = 1 << 2;

$(function() {

	var $furnitureContainer = $("#furniture-container");

	var tileHeightRaw = (GRID_TILE_HYP * 2 - 2);
	var tileWidthRaw = ((GRID_TILE_HYP * 2 - 2) * 2);

	var gridOriginYRaw = (GRID_TILE_HYP-1) * GRID_ROWS + 1 + WALL_HEIGHT_RAW;
	var gridOriginXRaw = GRID_OFFSET_X;

	var gridWidthScaled = (2 + (GRID_ROWS + GRID_COLS) * tileWidthRaw/2 + GRID_OFFSET_X) * SCALE;
	var gridHeightScaled = ((GRID_ROWS + GRID_COLS) * tileHeightRaw/2 + 2 + WALL_HEIGHT_RAW) * SCALE;

	var canvas = $('<canvas id="customize-room" width=' + gridWidthScaled + ' height=' + gridHeightScaled + '>')[0];
	var ctx = canvas.getContext("2d");
	$("#inner-content").prepend($(canvas));
	var offset = $(canvas).offset();

	var canvasBase = $('<canvas id="room-base" width=' + gridWidthScaled + ' height=' + gridHeightScaled + '>')[0];
	var ctxBase = canvasBase.getContext("2d");

	var canvasGrid = $('<canvas id="room-grid" width=' + gridWidthScaled + ' height=' + gridHeightScaled + '>')[0];
	var ctxGrid = canvasGrid.getContext("2d");

	var canvasSelectedTile = $('<canvas id="selected-tile" width=' + ((GRID_TILE_HYP*2-1)*2-2)*SCALE + ' height=' + (GRID_TILE_HYP*2-1)*SCALE + '>')[0];
	var ctxSelectedTile = canvasSelectedTile.getContext("2d");

	var imageSelectedWall = $("#wall-selected")[0];

	// this is to scale b/c images are already to scale
	var canvasColormap = $('<canvas id="colormap" width=' + gridWidthScaled + ' height=' + gridHeightScaled + '>')[0];
	var ctxColormap = canvasColormap.getContext("2d");
	// $(canvasColormap).css("margin-top", "10px");
	// $(canvasColormap).css("margin-top", "10px");
	// $("#inner-content").append($(canvasColormap));

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
	var hoverFurniture;

	var dragFurniture;
	var $dragFurnitureImg;
	var dragFurnitureUnderTile;
	var dragFurnitureSurface;
	var dragOffsetXScaled, dragOffsetYScaled;

	var roomFloor;
	var roomWallpaper;

	var mx, my;

	var drawGridTileToPixels = function(tx, ty, pdata, w, h, sl, sides) {
		for (var k = 0; k < 4; k++) {
			if (sides && !sides[k]) continue;
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

						drawScaledPixel(px, py, pdata, w, h, SCALE, 255, 255, 255, 150);
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

	var isWallFurniture = function(furniture) {
		return furniture.subcategory !== "wallpaper" && furniture.subcategory !== "floor" && !furniture.baseTiles;
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
			return [1, Math.floor((gridWidthScaled - (dxs + furniture.imageWidth)) / (tileWidthRaw * SCALE / 2))];
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

	var wallFurnitureTileToPosScaled = function(furniture, wallSide, wallCol) {
		if (wallSide === undefined) wallSide = furniture.wallSide;
		if (wallCol === undefined) wallCol = furniture.wallCol;
		if (wallSide < 0) {
			return [(gridOriginXRaw + tileWidthRaw/2 * wallCol + 1 + furniture.baseOffsetX) * SCALE,
			(gridOriginYRaw - tileHeightRaw/2 * wallCol - WALL_HEIGHT_RAW + furniture.baseOffsetY) * SCALE];
		} else {
			return [(gridOriginXRaw - tileWidthRaw/2 * wallCol - furniture.baseOffsetX) * SCALE + gridWidthScaled - furniture.imageWidth,
			(gridOriginYRaw - tileHeightRaw/2 * wallCol - WALL_HEIGHT_RAW + furniture.baseOffsetY) * SCALE];
		}
	};

	var gridTileInRange = function(r, c) {
		return r >= 0 && c >= 0 && r < GRID_ROWS && c < GRID_COLS;
	};

	var isValidFloorPosition = function(furniture, r, c) {
		// todo: redundant for dragfurniture
		var underSurfaceFurniture = getUnderFurnitureSurface(furniture, [r, c]);

		for (var i = 0; i < furniture.baseRows; i++) {
			for (var j = 0; j < furniture.baseCols; j++) {
				var underTileIdx = i * furniture.baseCols + j;
				if (furniture.baseTiles[underTileIdx] && !gridTileInRange(r + i, c + j)) {
					return false;
				}
				var underFurniture = gridFurnitureTiles[(r+i) * GRID_COLS + (c+j)];
				if (underFurniture && underFurniture !== underSurfaceFurniture) {
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

	var createFurnitureObjectFromElement = function(fel) {
		var fobj = {
			"images" : {
				"thumb" : fel.find(".furniture-thumb"),
				"inner" : fel.find(".furniture-inner").toArray(),
				"outline" : fel.find(".furniture-outline").toArray(),
				"shadow" : fel.find(".furniture-shadow").toArray(),
				"tiles" : fel.find(".furniture-tile").toArray(),
			},
			"itemId" : fel.attr("data-item-id"),
			"itemName" : fel.attr("data-item-name"),
			"itemAlias" : fel.attr("data-item-alias"),
			"subcategory" : fel.attr("data-item-subcategory"),
			"occupiesSurface" : fel.attr("data-occupies-surface"),
			"baseOffsetX" : parseInt(fel.attr("data-base-offset-x")),
			"baseOffsetY" : parseInt(fel.attr("data-base-offset-y")),
			"baseRows" : parseInt(fel.attr("data-base-rows")),
			"baseCols" : parseInt(fel.attr("data-base-cols")),
			"surfaceHeight" : parseInt(fel.attr("data-surface-height")),
			"baseTiles" : (fel.attr("data-base-tiles-bits") ? 
				$.map(parseInt(fel.attr("data-base-tiles-bits")).toString(2).split(""), 
					function(n, i) { return parseInt(n); }) 
				: undefined),
			"surfaceTiles" : (fel.attr("data-surface-tiles-bits") ? 
				$.map(parseInt(fel.attr("data-surface-tiles-bits")).toString(2).split(""), 
					function(n, i) { return parseInt(n); }) 
				: undefined),
			"surfaceFurniture" : (fel.attr("data-surface-tiles-bits") ? 
				[] : undefined),
		};

		console.log(fobj.itemId);

		fobj.imageWidth = $(fobj.images.inner[0]).width();
		fobj.imageHeight = $(fobj.images.inner[0]).height();

		return fobj;
	};

	var hasSurfaceOccupants = function(furniture) {
		if (!furniture.surfaceOccupants) return false;
		for (var i = 0; i < furniture.surfaceOccupants.length; i++) {
			if (furniture.surfaceOccupants[i]) return true;
		}
		return false;
	};

	var drawAll = function() {
		ctx.clearRect(0, 0, canvas.width, canvas.height);
		ctx.drawImage(canvasBase, roomOffsetXScaled, roomOffsetYScaled);
		ctx.drawImage(canvasGrid, roomOffsetXScaled, roomOffsetYScaled);
		if (dragFurniture && !dragFurnitureSurface) drawDragFurnitureHighlight();
		if (!dragFurniture && hoverGridTile && gridTileInRange(hoverGridTile[0], hoverGridTile[1])) {
			ctx.drawImage(canvasSelectedTile, 
				roomOffsetXScaled + hoverGridTilePosScaled[0], 
				roomOffsetYScaled + hoverGridTilePosScaled[1]);
		}
		for (var w = 0; w < wallFurnitureUnique.length; w++) {
			var wf = wallFurnitureUnique[w];
			drawWallFurnitureInRoom(wf);
		}
		var gf;
		for (var g1 = 0; g1 < gridFurniture.length; g1++) {
			gf = gridFurniture[g1];
			drawFloorFurnitureInRoom(gf, SHADOW_PASS);
		}
		for (var g2 = 0; g2 < gridFurniture.length; g2++) {
			gf = gridFurniture[g2];
			drawFloorFurnitureInRoom(gf, NORMAL_PASS);
		}
		if (dragFurniture && dragFurnitureSurface) drawDragFurnitureHighlight();
	};

	var mousemoveRoom = function(e, px, py) {
		hoverGridTile = posScaledToGridTile(px, py);
		hoverGridTilePosScaled = gridTileToPosScaled(hoverGridTile[0], hoverGridTile[1]);

		var colorOrig = Math.floor(py * canvasColormap.width + px) * 4;
		var idx = pdataColormap[colorOrig]*65025 + pdataColormap[colorOrig+1]*255 + pdataColormap[colorOrig+2];
		hoverFurniture = getFurnitureByColormapIndex(idx);
		if (hoverFurniture && hasSurfaceOccupants(hoverFurniture)) hoverFurniture = undefined;

		drawAll();
	};

	var mousedownRoom = function(e, px, py) {
		var colorOrig = Math.floor(py * canvasColormap.width + px) * 4;
		var idx = pdataColormap[colorOrig]*65025 + pdataColormap[colorOrig+1]*255 + pdataColormap[colorOrig+2];
		var furniture = removeFurnitureFromRoom(idx);
		if (furniture) {
			setDragFurniture(furniture);
			moveDragFurniture(e);
			drawColormap();
			drawAll();
		}
	};

	var createFurnitureComposite = function(furniture) {
		var $composite = $("<canvas width=" + furniture.imageWidth + " height=" + furniture.imageHeight + ">");
		var compositeCtx = $composite[0].getContext("2d");
		compositeCtx.drawImage(furniture.images.inner[0], 0, 0);
		compositeCtx.drawImage(furniture.images.outline[0], 0, 0);
		compositeCtx.save();
		compositeCtx.globalCompositeOperation = "lighter";
		compositeCtx.globalAlpha *= HIGHLIGHT_ALPHA;
		compositeCtx.drawImage(furniture.images.inner[0], 0, 0);
		compositeCtx.restore();
		return $composite[0];
	};

	var setDragFurniture = function(df) {
		dragFurniture = df;
		var dragFurnitureImages = dragFurniture.images;
		if (dragFurniture.subcategory === "wallpaper" || dragFurniture.subcategory === "floor") {
			$dragFurnitureImg = $(dragFurnitureImages.thumb).clone();
		} else {
			if (!dragFurniture.images.composite) {
				dragFurnitureImages.composite = createFurnitureComposite(dragFurniture);
			}
			$dragFurnitureImg = $(dragFurnitureImages.composite);
		}
		$dragFurnitureImg.css("position", "fixed");
		
		$("body").append($dragFurnitureImg);

		dragOffsetXScaled = $dragFurnitureImg.width() / 2;
		dragOffsetYScaled = $dragFurnitureImg.height() / 2;

		$dragFurnitureImg.on('drag', function(event) { return false; });
		$dragFurnitureImg.on('dragstart', function(event) { return false; });

		$("body").mouseup(function(e) {
			mx = e.pageX;
			my = e.pageY;
			
			if (mx - offset.left >= roomOffsetXScaled && mx - offset.left < roomOffsetXScaled + gridWidthScaled &&
				my - offset.top >= roomOffsetYScaled && my - offset.top < roomOffsetYScaled + gridHeightScaled) {
				dropFurnitureInRoom();
			}

			resetDrag();
			drawAll();
		});
	};

	var resetDrag = function() {
		dragFurniture = undefined;
		$dragFurnitureImg.remove();
		$dragFurnitureImg = undefined;
		dragFurnitureSurface = undefined;
		dragFurnitureUnderTile = undefined;
		$("body").off("mouseup");
	};

	var getFurnitureByColormapIndex = function(idx) {
		if (idx >= 0 && idx < wallFurnitureUnique.length) {
			return wallFurnitureUnique[idx];
		} else if (idx >= wallFurnitureUnique.length && idx < gridFurniture.length + wallFurnitureUnique.length) {
			return gridFurniture[idx - wallFurnitureUnique.length];
		}
	};

	var removeFurnitureFromRoom = function(idx) {
		var removeFurniture;
		if (idx >= 0 && idx < wallFurnitureUnique.length) {
			removeFurniture = wallFurnitureUnique.splice(idx, 1)[0];
			if (removeFurniture.wallSide < 0) {
				for (w = 0; w < removeFurniture.baseCols; w++) {
					wallFurnitureLeft[w + removeFurniture.wallCol] = undefined;
				}
			} else {
				for (w = 0; w < removeFurniture.baseCols; w++) {
					wallFurnitureRight[w + removeFurniture.wallCol] = undefined;
				}
			}
			return removeFurniture;
		} else if (idx >= wallFurnitureUnique.length && idx < gridFurniture.length + wallFurnitureUnique.length) {
			removeFurniture = gridFurniture[idx - wallFurnitureUnique.length];
			if (hasSurfaceOccupants(removeFurniture)) return;
			gridFurniture.splice(idx - wallFurnitureUnique.length, 1);
				for (var i = 0; i < removeFurniture.baseRows; i++) {
				for (var j = 0; j < removeFurniture.baseCols; j++) {
					var r = removeFurniture.gridRow+i;
					var c = removeFurniture.gridCol+j;
					if (gridFurnitureTiles[r * GRID_COLS + c] === removeFurniture) {
						gridFurnitureTiles[r * GRID_COLS + c] = undefined;
					}
				}
			}
			if (removeFurniture.surface) {

				occupySurface(removeFurniture, removeFurniture.surface, 
					removeFurniture.gridRow - removeFurniture.surface.gridRow,
					removeFurniture.gridCol - removeFurniture.surface.gridCol,
					true);
			}
			return removeFurniture;
		}
	};

	var getDragFurnitureOffset = function(dragFurniture) {
		var fx = Math.floor(mx - offset.left - roomOffsetXScaled - dragOffsetXScaled + dragFurniture.baseOffsetX * SCALE);
		var fy = Math.floor(my - offset.top - roomOffsetYScaled - dragOffsetYScaled + dragFurniture.baseOffsetY * SCALE);
		if (dragFurniture.baseTiles) {
			fx += tileWidthRaw/2 * SCALE;
			fy += tileHeightRaw/2 * SCALE;
		}
		return [fx, fy];
	};

	var drawDragFurnitureHighlight = function() {
		ctx.save();
		ctx.globalCompositeOperation = "lighter";

		if (!dragFurniture) return;
		var i, j, underTileIdx, tpos;

		if (!dragFurniture.baseTiles) {
			if (dragFurniture.subcategory === "wall") {
				
				if (dragFurnitureUnderTile[0] === -1) {
					for (i = 0; i < dragFurniture.baseCols; i++) {
						tpos = wallTileToPosScaled(dragFurnitureUnderTile[0], dragFurnitureUnderTile[1] + i, true);
						ctx.drawImage(imageSelectedWall, tpos[0] + roomOffsetXScaled, tpos[1] + roomOffsetYScaled);
					}
				} else {
					ctx.save();
					ctx.scale(-1, 1);
					ctx.translate(-canvas.width, 0);
					for (i = 0; i < dragFurniture.baseCols; i++) {
						tpos = wallTileToPosScaled(dragFurnitureUnderTile[0], dragFurnitureUnderTile[1] + i, true);
						ctx.drawImage(imageSelectedWall, canvas.width - (tpos[0] + roomOffsetXScaled), tpos[1] + roomOffsetYScaled);
					}
					ctx.restore();
				}
			}
		} else {
			for (j = 0; j < dragFurniture.baseRows; j++) {
				for (i = 0; i < dragFurniture.baseCols; i++) {
					underTileIdx = j * dragFurniture.baseCols + i;
					if (dragFurniture.baseTiles[underTileIdx]) {
						tpos = gridTileToPosScaled(dragFurnitureUnderTile[0] + i, dragFurnitureUnderTile[1] + j);
						if (dragFurnitureSurface) {
							tpos[1] -= dragFurnitureSurface.surfaceHeight * SCALE;
						}
						ctx.drawImage(canvasSelectedTile, tpos[0] + roomOffsetXScaled, tpos[1] + roomOffsetYScaled);
					}
				}
			}
		}
		ctx.restore();
	};

	var getFurnitureTileAtGridTile = function(gr, gc) {
		var furniture = gridFurnitureTiles[gr * GRID_COLS + gc];
		var fr, fc;
		if (furniture && furniture.baseTiles) {
			fr = gr - furniture.gridRow;
			fc = gc - furniture.gridCol;
		}
		return [furniture, fr, fc];
	};

	var resolveFurnitureOrdering = function(rows, cols, tiles, addToOrdering) {
		ordering = [];
		var idDict = {};
		var outgoingEdges = {};
		var incomingEdges = {};
		var isRoot = {};

		var bucketTile = function(r, c, bucket, ranking, lastSeen) {
			var furniture = tiles[r * cols + c];
			if (furniture && furniture !== lastSeen) {
				bucket.push(furniture);
				ranking.push(c - r);
				isRoot[furniture.itemId] = true;
				idDict[furniture.itemId] = furniture;
			}

			return furniture;
		};

		var buckets = [];
		var rankings = [];
		var di, bucket;

		for (di = 0; di < rows + cols; di++) {
			bucket = [];
			var ranking = [];
			var lastSeen;
			if (di < cols) {
				for (r = 0; r < Math.min(di+1, rows); r++) {
					c = di - r;
					lastSeen = bucketTile(r, c, bucket, ranking, lastSeen);
				}
			} else {
				for (c = cols-1; c > di - rows; c--) {
					r = cols - c + (di - cols);
					lastSeen = bucketTile(r, c, bucket, ranking, lastSeen);
				}
			}
			buckets[di] = bucket;
			rankings[di] = ranking;
		}

		var compareBucketToNext = function(bi) {
			var bucket1 = buckets[bi];
			var ranking1 = rankings[bi];

			var bucket2 = buckets[bi+1];
			var ranking2 = rankings[bi+1];

			var b1i = 0;
			var furniture1 = bucket1[b1i];
			var frank1 = ranking1[b1i];
			
			var b2i = 0;
			var furniture2 = bucket2[b2i];
			var frank2 = ranking2[b2i];

			while (b1i < bucket1.length && b2i < bucket2.length) {
				if (frank1 > frank2) {
					
					if (furniture1 !== furniture2) {

						if (!incomingEdges[furniture2.itemId]) incomingEdges[furniture2.itemId] = {};
						incomingEdges[furniture2.itemId][furniture1.itemId] = true;

						if (!outgoingEdges[furniture1.itemId]) outgoingEdges[furniture1.itemId] = {};
						outgoingEdges[furniture1.itemId][furniture2.itemId] = true;
					
						isRoot[furniture2.itemId] = false;
					}

					b1i++;
					furniture1 = bucket1[b1i];
					frank1 = ranking1[b1i];

				} else if (frank2 > frank1) {
					if (furniture1 !== furniture2) {

						if (!incomingEdges[furniture1.itemId]) incomingEdges[furniture1.itemId] = {};
						incomingEdges[furniture1.itemId][furniture2.itemId] = true;

						if (!outgoingEdges[furniture2.itemId]) outgoingEdges[furniture2.itemId] = {};
						outgoingEdges[furniture2.itemId][furniture1.itemId] = true;
						
						isRoot[furniture1.itemId] = false;
					}

					b2i++;
					furniture2 = bucket2[b2i];
					frank2 = ranking2[b2i];

				} else {
					console.log("WTF!?");
				}
			}
		};

		for (di = 0; di < rows + cols - 1; di++) {
			bucket = buckets[di];
			for (var bi = 0; bi < bucket.length - 1; bi++) {
				var frontId = bucket[bi].itemId;
				var behindId = bucket[bi+1].itemId;

				if (!outgoingEdges[frontId]) outgoingEdges[frontId] = {};
				outgoingEdges[frontId][behindId] = true;

				if (!incomingEdges[behindId]) incomingEdges[behindId] = {};
				incomingEdges[behindId][frontId] = true;

				isRoot[behindId] = false;
			}

			compareBucketToNext(di);
		}

		var rootIds = [];
		for (var fid in isRoot) {
			if (isRoot[fid]) rootIds.push(fid);
		}

		var finished = {};
		ordering = [];

		while (rootIds.length > 0) {
			var nodeId = rootIds.pop();
			ordering = addToOrdering(ordering, idDict[nodeId]);
			for (var nextId in outgoingEdges[nodeId]) {
				delete incomingEdges[nextId][nodeId];
				if (Object.keys(incomingEdges[nextId]).length === 0) {
					rootIds.push(nextId);
				}
			}
		}

		ordering.reverse();
		return ordering;
	};

	var resolveGridFurnitureOrdering = function() {

		var addToSurfaceOrdering = function(so, sf) {
			so.push(sf);
			return so;
		};

		var addToOrdering = function(ordering, furniture) {
			if (furniture.surfaceOccupants) {
				var surfaceOrdering = resolveFurnitureOrdering
				(furniture.baseRows, furniture.baseCols, furniture.surfaceOccupants, addToSurfaceOrdering);
				ordering = ordering.concat(surfaceOrdering);
			}
			ordering.push(furniture);
			return ordering;
		};

		gridFurniture = resolveFurnitureOrdering(GRID_ROWS, GRID_COLS, gridFurnitureTiles, addToOrdering);
	};

	var dropFurnitureInRoom = function() {
		if (dragFurniture.subcategory === "floor") {
			roomFloor = dragFurniture;
			initBase();
		} else if (dragFurniture.subcategory === "wallpaper") {
			roomWallpaper = dragFurniture;
			initBase();
		} else {
			var fp = getDragFurnitureOffset(dragFurniture);
			var fx = fp[0];
			var fy = fp[1];
			
			if (!dragFurniture.baseTiles) {
				if (!isValidWallPosition(dragFurniture, dragFurnitureUnderTile[0], dragFurnitureUnderTile[1])) return;

				dragFurniture.wallSide = dragFurnitureUnderTile[0];
				dragFurniture.wallCol = dragFurnitureUnderTile[1];

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
				if (!isValidFloorPosition(dragFurniture, dragFurnitureUnderTile[0], dragFurnitureUnderTile[1])) return;

				dragFurniture.gridRow = dragFurnitureUnderTile[0];
				dragFurniture.gridCol = dragFurnitureUnderTile[1];

				var i, j, r, c;

				if (dragFurnitureSurface) {
					occupySurface(dragFurniture, dragFurnitureSurface, 
						dragFurniture.gridRow - dragFurnitureSurface.gridRow,
						dragFurniture.gridCol - dragFurnitureSurface.gridCol);
				}

				else {
					for (i = 0; i < dragFurniture.baseRows; i++) {
						for (j = 0; j < dragFurniture.baseCols; j++) {
							r = dragFurniture.gridRow+i;
							c = dragFurniture.gridCol+j;
							gridFurnitureTiles[r * GRID_COLS + c] = dragFurniture;
						}
					}
				}
				resolveGridFurnitureOrdering();
			}
			drawColormap();
		}
	};

	var occupySurface = function(furniture, surface, surfaceRow, surfaceCol, remove) {
		if (!surface.surfaceOccupants) surface.surfaceOccupants = [];
		for (i = 0; i < furniture.baseRows; i++) {
			for (j = 0; j < furniture.baseCols; j++) {
				var ur = surfaceRow + i;
				var uc = surfaceCol + j;
				surface.surfaceOccupants[ur * surface.baseCols + uc] = remove ? undefined : furniture;
			}
		}
		console.log(surface.surfaceOccupants);
		console.log("AT", surfaceRow, surfaceCol);
		furniture.surface = remove ? undefined : surface;
	};

	// this will fail if you have more than 65025 items in your room. LOL!
	var drawColormap = function() {
		ctxColormap.save();
		ctxColormap.fillStyle = "white";
		ctxColormap.fillRect(0, 0, canvasColormap.width, canvasColormap.height);

		var i, item, tpos;

		for (i = 0; i < wallFurnitureUnique.length; i++) {
			item = wallFurnitureUnique[i];
			if (!item) continue;
			ctxColormap.save();
			transformToWallFurniture(item, ctxColormap);
			renderFurnitureColormap(item, i);
			ctxColormap.restore();
		}

		for (i = 0; i < gridFurniture.length; i++) {
			item = gridFurniture[i];
			ctxColormap.save();
			transformToFloorFurniture(item, ctxColormap);
			renderFurnitureColormap(item, i + wallFurnitureUnique.length);
			ctxColormap.restore();
		}

		ctxColormap.restore();
		pdataColormap = ctxColormap.getImageData(0, 0, canvasColormap.width, canvasColormap.height).data;
	};

	var renderFurnitureColormap = function(furniture, ci) {
		var composite = furniture.images.composite;
		ctxColormap.save();
		if (isWallFurniture(furniture) && furniture.wallSide < 0) {
			ctxColormap.globalCompositeOperation = "xor";
			ctxColormap.drawImage(composite, 0, 0);
			ctxColormap.globalCompositeOperation = "destination-over";
			ctxColormap.fillStyle = "rgba(" + Math.floor(ci/65025) + "," + Math.floor((ci/(255)) % 255) + "," + (ci % 255) + ", 255)";
			ctxColormap.fillRect(0, 0, composite.width, composite.height);
		} else {
			ctxColormap.globalCompositeOperation = "xor";
			ctxColormap.drawImage(composite, 0, 0);
			ctxColormap.globalCompositeOperation = "destination-over";
			ctxColormap.fillStyle = "rgba(" + Math.floor(ci/65025) + "," + Math.floor((ci/(255)) % 255) + "," + (ci % 255) + ", 255)";
			ctxColormap.fillRect(0, 0, composite.width, composite.height);
		}
		ctxColormap.restore();
	};

	var mouseupRoom = function(e, px, py) {
	};

	var mouseupSelect = function(e, px, py) {
	};

	var initGrid = function() {
		var imageData = ctxGrid.getImageData(0, 0, canvasGrid.width, canvasGrid.height);
		var pdata = imageData.data;
		var i, j;
		for (j = 0; j < GRID_COLS; j++) {
			for (i = 0; i < GRID_ROWS; i++) {
				var tpos = gridTileToPosScaled(i, j);
				//drawGridTileToPixels(tpos[0], tpos[1], pdata, canvasGrid.width, canvasGrid.height);
			}
		}
		ctxGrid.putImageData(imageData, 0, 0);
	};

	var initCage = function() {
		var imageData = ctxBase.getImageData(0, 0, canvasBase.width, canvasBase.height);
		var pdata = imageData.data;
		var orig;

		for (i = 0; i < GRID_ROWS; i++) {
			orig = wallTileToPosScaled(-1, i, 1);
			drawGridTileToPixels(orig[0], orig[1], pdata, canvasBase.width, canvasBase.height, false, [1, 0, 0, 0]);
		}

		for (i = 0; i < GRID_COLS; i++) {
			orig = wallTileToPosScaled(1, i+1, 1);
			drawGridTileToPixels(orig[0], orig[1], pdata, canvasBase.width, canvasBase.height, false, [0, 0, 1, 0]);
		}

		for (i = 0; i < GRID_COLS; i++) {
			orig = gridTileToPosScaled(0, i);
			drawGridTileToPixels(orig[0], orig[1], pdata, canvasBase.width, canvasBase.height, false, [0, 0, 1, 0]);
		}

		for (i = 0; i < GRID_ROWS; i++) {
			orig = gridTileToPosScaled(i, GRID_COLS-1);
			drawGridTileToPixels(orig[0], orig[1], pdata, canvasBase.width, canvasBase.height, false, [0, 0, 0, 1]);
		}

		orig = wallTileToPosScaled(-1, 0, 0);
		for (i = 0; i < WALL_HEIGHT_RAW-1; i++) {
			drawScaledPixel(orig[0], orig[1] + i*SCALE, pdata, canvasBase.width, canvasBase.height, SCALE, 0, 0, 0, 255);
		}

		orig = wallTileToPosScaled(1, 0, 0);
		for (i = 0; i < WALL_HEIGHT_RAW-1; i++) {
			drawScaledPixel(orig[0]-SCALE, orig[1] + i*SCALE, pdata, canvasBase.width, canvasBase.height, SCALE, 0, 0, 0, 255);
		}

		ctxBase.putImageData(imageData, 0, 0);
	};

	var initBase = function() {
		ctxBase.clearRect(0, 0, gridWidthScaled, gridHeightScaled);
		initWallpaper();
		initFloor();
		initCage();
	};

	var initFloor = function() {
		if (!roomFloor) return;
		for (var r = 0; r < GRID_ROWS; r++) {
			for (var c = 0; c < GRID_COLS; c++) {
				var fr = r % roomFloor.baseRows;
				var fc = c % roomFloor.baseCols;
				var fimg = roomFloor.images.tiles[fr * roomFloor.baseCols + fc];
				var gps = gridTileToPosScaled(r, c);
				var gx = gps[0];
				var gy = gps[1];
				ctxBase.drawImage(fimg, 
					(gx - (roomFloor.baseOffsetX-1) * SCALE), 
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
			wimg = roomWallpaper.images.tiles[wr];
			gps = gridTileToPosScaled(r, 0);
			gx = gps[0];
			gy = gps[1] - (WALL_HEIGHT_RAW - 1) * SCALE;
			ctxBase.drawImage(wimg,
				(gx - roomWallpaper.baseOffsetX),
				(gy - roomWallpaper.baseOffsetY));
		}
		for (c = 0; c < GRID_COLS; c++) {
			wc = c % roomWallpaper.baseCols;
			wimg = roomWallpaper.images.tiles[wc + roomWallpaper.baseCols];
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
		drawGridTileToPixels(0, 0, pdata, canvasSelectedTile.width, canvasSelectedTile.height, true);
		ctxSelectedTile.putImageData(imageData, 0, 0);
	};

	var drawWallFurnitureInRoom = function(furniture) {
		ctx.save();
		transformToWallFurniture(furniture, ctx);
		renderFurnitureRoom(furniture, ctx);
		ctx.restore();
	};

	var transformToWallFurniture = function(furniture, ctx) {
		var fp = wallFurnitureTileToPosScaled(furniture);
		if (furniture.wallSide < 0) {
			ctx.scale(-1, 1);
			ctx.translate(-(fp[0] + roomOffsetXScaled) - furniture.imageWidth, fp[1] + roomOffsetYScaled);
		} else {
			ctx.translate(fp[0] + roomOffsetXScaled, fp[1] + roomOffsetYScaled);
		}
	};

	var transformToFloorFurniture = function(furniture, ctx) {
		var fp = gridTileToPosScaled(furniture.gridRow, furniture.gridCol);
		ctx.translate(fp[0] - furniture.baseOffsetX*SCALE + roomOffsetXScaled, fp[1] - furniture.baseOffsetY*SCALE + roomOffsetYScaled);
		if (furniture.surface) {
			ctx.translate(0, -furniture.surface.surfaceHeight * SCALE);
		}
	};

	var drawFloorFurnitureInRoom = function(furniture, pass) {
		ctx.save();
		transformToFloorFurniture(furniture, ctx);
		renderFurnitureRoom(furniture, ctx, pass);
		ctx.restore();
	};

	var renderFurnitureRoom = function(furniture, ctx, pass) {
		ctx.save();
		if (pass === SHADOW_PASS && furniture.images.shadow.length > 0) {
			ctx.save();
			ctx.globalCompositeOperation = "multiply";
			if (dragFurniture && furniture !== dragFurnitureSurface) ctx.globalAlpha *= TRANSLUCENT_ALPHA;
			ctx.globalAlpha *= SHADOW_ALPHA;
			ctx.drawImage(furniture.images.shadow[0], 0, 0);
			ctx.restore();
		} else {
			if (dragFurniture && furniture !== dragFurnitureSurface) ctx.globalAlpha *= TRANSLUCENT_ALPHA;
			ctx.drawImage(furniture.images.inner[0], 0, 0);
			ctx.globalCompositeOperation = "multiply";
			ctx.drawImage(furniture.images.outline[0], 0, 0);

			if (!dragFurniture && furniture === hoverFurniture) {
				ctx.globalCompositeOperation = "lighter";
				ctx.globalAlpha *= HIGHLIGHT_ALPHA;
				ctx.drawImage(furniture.images.inner[0], 0, 0);
			}
		}
		ctx.restore();
	};

	var moveDragFurniture = function(e) {
		var fp = getDragFurnitureOffset(dragFurniture);
		var fx = fp[0];
		var fy = fp[1];

		var nUnderTile;
		var underTileChanged = false;

		if (dragFurniture.baseTiles) {
			nUnderTile = posScaledToGridTile(fx, fy);
			if (!dragFurnitureUnderTile || nUnderTile[0] !== dragFurnitureUnderTile[0] || nUnderTile[1] !== dragFurnitureUnderTile[1]) {
				underTileChanged = true;
				dragFurnitureSurface = getUnderFurnitureSurface(dragFurniture, nUnderTile);	
			}
		}

		$dragFurnitureImg.css("left", (e.pageX - dragOffsetXScaled) + "px");
		$dragFurnitureImg.css("top", (e.pageY - dragOffsetYScaled - DRAG_ITEM_HEIGHT - (dragFurnitureSurface ? dragFurnitureSurface.surfaceHeight*SCALE : 0)) + "px");

		if (isWallFurniture(dragFurniture)) {
			nUnderTile = furniturePosScaledToWallTile(dragFurniture, fx, fy);
			if (!dragFurnitureUnderTile || nUnderTile[0] !== dragFurnitureUnderTile[0] || nUnderTile[1] !== dragFurnitureUnderTile[1]) {
				underTileChanged = true;
				if (nUnderTile[0] < 1) $dragFurnitureImg.addClass("flipped");
				else $dragFurnitureImg.removeClass("flipped");
			}
		}
		dragFurnitureUnderTile = nUnderTile;
		return underTileChanged;
	};

	var getUnderFurnitureSurface = function(furniture, underTileOrig) {
		if (!furniture.occupiesSurface) return undefined;
		for (j = 0; j < furniture.baseRows; j++) {
			for (i = 0; i < furniture.baseCols; i++) {
				var r = underTileOrig[0] + j;
				var c = underTileOrig[1] + i;
				var underFurniture = gridFurnitureTiles[r * GRID_COLS + c];
				if (underFurniture && underFurniture.surfaceTiles) {
					var ur = r - underFurniture.gridRow;
					var uc = c - underFurniture.gridCol;
					if (underFurniture.surfaceTiles[ur * underFurniture.baseCols + uc]) {
						return underFurniture;
					}
				}
			}
		}
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

		if (dragFurniture) {
			e.preventDefault();
			e.stopPropagation();
			if (moveDragFurniture(e)) {
				drawAll();
			}
		}
		
		if (mx - offset.left >= roomOffsetXScaled && mx - offset.left < roomOffsetXScaled + gridWidthScaled &&
			my - offset.top >= roomOffsetYScaled && my - offset.top < roomOffsetYScaled + gridHeightScaled) {
			mousemoveRoom(e, mx - roomOffsetXScaled - offset.left, my - roomOffsetYScaled - offset.top);
			if (!dragFurniture) {
				drawAll();
			}
		}
	});

	$(".furniture-thumb").mousedown(function(e) {
		e.preventDefault();
		var $fel = $(this).parent();
		var furniture = createFurnitureObjectFromElement($fel);
		setDragFurniture(furniture);
		moveDragFurniture(e);
	});

	initBase();
	initGrid();
	initSelectedTile();
	//gatherFurnitureSelection();
	drawColormap();

	drawAll();

});