var updateAvatar = function(newPath) {
	$("#outfit-preview").attr("src", newPath);
};

var inflateEquippedItemListings = function() {
	$(".equipped-item").each(function(i) {
		inflateEquippedItemListing($(this));
	});
};

var inflateWardrobeItemListings = function() {
	$(".wardrobe-item").each(function(i) {
		console.log(i);
		inflateWardrobeItemThumbListing($(this));
	});
};

var populateWardrobeItemListings = function(wardrobeItems) {
	var listul = $("#subcategory-items ul");
	listul.empty();
	for (var i = 0; i < wardrobeItems.length; i++) {
		listul.append(createWardrobeItemThumbListing(wardrobeItems[i]));
	}
};

var createLayerElement = function(layer) {
	var layerListing = $("<li class='equipped-layer'>");
	layerListing.attr("id", "equipped-layer-" + layer);
	var layerHeader = $("<p class='header'>");
	layerHeader.html(layer);
	layerListing.append(layerHeader);
	layerListing.append($("<ul>"));
	return layerListing;
};

var createEquippedItemListing = function(wardrobeItem) {
	var listing = $("<li>");
	listing.attr("id", "equipped-item-" + wardrobeItem.attr("data-item-id"));
	listing.attr("data-item-id", wardrobeItem.attr("data-item-id"));
	listing.attr("data-item-name", wardrobeItem.attr("data-item-name"));
	listing.attr("data-item-variety", wardrobeItem.attr("data-item-variety"));
	inflateEquippedItemListing(listing);
	return listing;
};

var inflateEquippedItemListing = function(listing) {
	listing.addClass("equipped-item");

	var listingName = $("<span>");
	var itemName = listing.attr("data-item-name");
	var itemId = listing.attr("data-item-id");

	listingName.attr("name", itemName).html(itemName);
	listing.append(listingName);

	var actions = $("<div class=\"actions\">");
	
	var unequipButton = $("<button>");
	unequipButton.attr("data-item-id", itemId)
		.attr("data-item-name", itemName)
		.addClass("unequip")
		.addClass("hover-pointer")
		.addClass("equipped-item-action")
		.html("x");

	actions.append(unequipButton);
	listing.append(actions);
	
	return listing;
};

var createWardrobeItemThumbListing = function(wardrobeItem) {
	var listing = $("<li>");
	listing.attr("id", "wardrobe-item-" + wardrobeItem.item_id);
	listing.attr("data-item-id", wardrobeItem.item_id);
	listing.attr("data-item-name", wardrobeItem.item_name);
	listing.attr("data-item-subcategory", wardrobeItem.subcategory);
	listing.attr("data-item-in-outfit", wardrobeItem.in_outfit);
	listing.attr("data-item-variety", wardrobeItem.varieties.split(',')[0]);
	
	inflateWardrobeItemThumbListing(listing);
	return listing;
};

var inflateWardrobeItemThumbListing = function(listing) {
	listing.attr("data-item-layer", schemas.definitions.item_equips.layer(listing));
	listing.addClass("wardrobe-item");
	listing.addClass("hover-pointer");
	var thumb = $("<img>");
	thumb.attr("src", "/images/items/thumbs/" + listing.attr("data-item-subcategory") + "/" + listing.attr("data-item-name") + ".png");
	listing.append(thumb);
	return listing;
};

var equipItemClientSide = function(itemId, wardrobeItem) {
	wardrobeItem = wardrobeItem || $("#wardrobe-item-"+itemId);
	console.log("equipped", wardrobeItem.attr("data-item-name"));
	var layerElem = $("#equipped-layer-" + wardrobeItem.attr("data-item-layer") + " ul");
	var insertItemElem = createEquippedItemListing(wardrobeItem);
	if (!layerElem[0].hasChildNodes()) {
		insertItemElem.attr("data-item-layer-order", 0);
		layerElem.append(insertItemElem);
	}
	else {
		var itemUnderElem = layerElem.children(":first");
		insertItemElem.attr("data-item-layer-order", 1+parseInt(itemUnderElem.attr("data-item-layer-order")));
		insertItemElem.insertBefore(itemUnderElem);
	}
	wardrobeItem.attr("data-item-in-outfit", true);
};

var equipItemServerSideRequest = function(equipData) {
	return function(callback) {
		$.ajax({
			type: "POST",
			url: "/dressroom/toggle_equip_item",
			data: equipData,
			success: function(res) {
				// TODO: check if item was successfully changed
				//refresh iamge
				var d = new Date();
				$("#outfit-preview").attr("src", "/images/testout.png?" + d.getTime());
				callback();
			},
			error: function(err) {
				console.log(err);
			}
		});
	};

};

var unequipItemClientSide = function(itemId, equippedItem) {
	equippedItem = equippedItem || $("li#equipped-item-" + itemId);
	console.log("unequipped item", equippedItem.attr("data-item-name"));
	// we assume layer-order = index!!
	var layerOrder = parseInt(equippedItem.attr("data-item-layer-order"));
	equippedItem.parent()
		.children(".equipped-item")
		.slice(0, equippedItem.index())
		.reverse().each(function(i, it) {
			it.setAttribute("data-item-layer-order", layerOrder);
			layerOrder++;
		});
	equippedItem.remove();
	$("#wardrobe-item-" + itemId).removeAttr("data-item-in-outfit");
};

var unequipItemServerSideRequest = function(itemId) {
	return function(callback) {
		$.ajax({
			type: "POST",
			url: "/dressroom/toggle_equip_item",
			data: { "item_id" : itemId },
			success: function(res) {
				var d = new Date();
				// refresh image
				$("#outfit-preview").attr("src", "/images/testout.png?" + d.getTime());
				callback();
			},
			error: function(err) {
				console.log(err);
			}
		});
	};
};

var shiftItemClientSide = function(itemId, predItemId, equippedItem, predEquippedItem) {
	// note that the elements should already be in position.
	// we just need to change the layer orders
	equippedItem = equippedItem || $("li#equipped-item-" + itemId);
	if (predItemId) predEquippedItem = predEquippedItem || $("li#equipped-item-" + predItemId);
	console.log("inserted item", equippedItem.attr("data-item-name"), "above", predEquippedItem.attr("data-item-id"));
	var layerOrder = parseInt(equippedItem.attr("data-item-layer-order"));
	var newLayerOrder;
	if (predEquippedItem && predEquippedItem.length > 0) newLayerOrder = parseInt(predEquippedItem.attr("data-item-layer-order")) + 1;
	else newLayerOrder = 0;
	if (newLayerOrder < layerOrder) {
		
		// item moved *lower* in zindex -> need to update listings *above* it
		equippedItem.parent()
			.children(".equipped-item")
			.slice(0, equippedItem.index() + 1)
			.reverse().each(function(i, it) {
				console.log(it.getAttribute("data-item-name"), "set to", newLayerOrder);
				it.setAttribute("data-item-layer-order", newLayerOrder);
				newLayerOrder++;
		});

	} else if (newLayerOrder > layerOrder) {
		newLayerOrder--;
		// item moved *higher* in zindex -> need to update listings *below* it
		equippedItem.parent()
			.children(".equipped-item")
			.slice(equippedItem.index())
			.each(function(i, it) {
				console.log(it.getAttribute("data-item-name"), "set to", newLayerOrder);
				it.setAttribute("data-item-layer-order", newLayerOrder);
				newLayerOrder--;	
			}
		);
	}
};

var shiftItemServerSideRequest = function(itemId, predItemId) {
	return function(callback) {
		$.ajax({
			type: "POST",
			url: "/dressroom/shift_equipped_item",
			data: { "item_id" : itemId, "pred_item_id" : predItemId },
			success: function(res) {
				var d = new Date();
				// refresh image
				$("#outfit-preview").attr("src", "/images/testout.png?" + d.getTime());
				callback();
			},
			error: function(err) {
				console.log(err);
			}
		});
	};
};

$(function() {

	inflateEquippedItemListings();
	inflateWardrobeItemListings();

	var reqQueue = seqqueue.newQueue();

	$(".equipped-layer ul").sortable({ 
		"start": function(e, ui) {
        	ui.placeholder.height(ui.item.height());
    	},
    	"update" : function(e, ui) {
    		var itemId = ui.item.attr("data-item-id");
    		var newPredItem = ui.item.next(".equipped-item");

    		var predItemId;
    		if (newPredItem) {
    			predItemId = newPredItem.attr("data-item-id");
    		}

    		shiftItemClientSide(itemId, predItemId, ui.item, newPredItem);

    		reqQueue.insert({
    			"execute": shiftItemServerSideRequest(itemId, predItemId),
				"respond": function(result) {

				}
    		});

    	}
    });

	// user pressed wardrobe tab
	$("#subcategory-tabs li").click(function(e) {
		$.ajax({
			type: "GET",
			url: "/dressroom/get_wardrobe_subcategory_items/" + $(this).html(),
			success: function(res) {
				populateWardrobeItemListings(res.wardrobe);
			},
			error: function(err) {
				console.log(err);
			}
		});
	});

	// user pressed "x" next to equipped item 
	// -> remove from equipped list & update outfit
	$("#equipped-col").on("click", "button.unequip", function(e) {
		var itemListing = $(this).closest(".equipped-item");
		var itemId = itemListing.attr("data-item-id");

		unequipItemClientSide(itemId, itemListing);
		reqQueue.insert({
			"execute": unequipItemServerSideRequest(itemId),
			"respond": function(result) {

			}
		});
	});

	// user clicked item in wardrobe
	$("#wardrobe-col").on("click", ".wardrobe-item", function(e) {
		var itemId =  $(this).attr("data-item-id");
		var isEquipping = ($(this).attr("data-item-in-outfit") === undefined);

		if (isEquipping) {
			var equipData = { 
				"item_id" : itemId,
				"equip_desc" : {
					"variety" : $(this).attr("data-item-variety")
				}
			};
			equipItemClientSide(itemId, $(this));
			reqQueue.insert({
				"execute": equipItemServerSideRequest(equipData),
				"respond": function(result) {
				}
			});
		}

		else {
			unequipItemClientSide(itemId);
			reqQueue.insert({
				"execute": unequipItemServerSideRequest(itemId),
				"respond": function(result) {
				}
			});
		}
	});

	$("#save-as-current").click(function(e) {
		$.ajax({
			type: "POST",
			url: "/dressroom/copy_outfit",
			data: { "src_outfit_name" : "wip", "dst_outfit_name" : "current" },
			success: function(res) {

			},
			error: function(err) {
				console.log(err);
			}
		});
	});
});