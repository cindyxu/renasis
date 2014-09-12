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
		inflateWardrobeItemThumbListing($(this));
	});
};

var populateWardrobeItemListings = function(wardrobeItems) {
	var listul = $("#subcategory-items ul");
	listul.empty();
	for (var i = 0; i < wardrobeItems.length; i++) {
		var wardrobeItem = wardrobeItems[i];
		listul.append(createWardrobeItemThumbListing({
			"id" : wardrobeItem._id, 
			"name" : wardrobeItem.name,
			"variety" : wardrobeItem.varieties[0]
		}));
	}
};

var createEquippedItemListing = function(props) {
	var listing = $("<li>");
	for (var i in props) {
		listing.attr("data-item-"+i, props[i]);
	}
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

	var shiftUpButton = $("<button>");
	shiftUpButton.attr("data-item-id", itemId)
		.attr("data-item-name", itemName)
		.attr("data-direction", -1)
		.addClass("shift")
		.addClass("hover-pointer")
		.addClass("equipped-item-action")
		.html("&uarr;");

	var shiftDownButton = $("<button>");
	shiftDownButton.attr("data-item-id", itemId)
		.attr("data-item-name", itemName)
		.attr("data-direction", 1)
		.addClass("shift")
		.addClass("hover-pointer")
		.addClass("equipped-item-action")
		.html("&darr;");

	var deequipButton = $("<button>");
	deequipButton.attr("data-item-id", itemId)
		.attr("data-item-name", itemName)
		.addClass("deequip")
		.addClass("hover-pointer")
		.addClass("equipped-item-action")
		.html("x");

	actions.append(shiftUpButton);
	actions.append(shiftDownButton);
	actions.append(deequipButton);
	listing.append(actions);
	
	return listing;
};

var createWardrobeItemThumbListing = function(props) {
	var listing = $("<li>");
	for (var i in props) {
		listing.attr("data-item-"+i, props[i]);
	}
	inflateWardrobeItemThumbListing(listing);
	return listing;
};

var inflateWardrobeItemThumbListing = function(listing) {
	listing.addClass("wardrobe-item");
	listing.addClass("hover-pointer");
	var thumb = $("<img>");
	thumb.attr("src", "/images/" + listing.attr("data-item-name") + "_thumb.png");
	listing.append(thumb);
	return listing;
};

$(function() {

	inflateEquippedItemListings();
	inflateWardrobeItemListings();

	$("#subcategory-tabs li").click(function(e) {
		$.ajax({
			type: "GET",
			url: "/character/0/dressroom/get_wardrobe_subcategory_items/" + $(this).html(),
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
	$("#equipped-col").on("click", "button.shift", function(e) {
		var itemListing = $(this).closest(".equipped-item");
		var itemName = itemListing.attr("data-item-name");
		var itemId = itemListing.attr("data-item-id");
		var direction = parseInt($(this).attr("data-direction"));

		var idx = itemListing.index();
		console.log(itemListing);
		console.log(idx, direction);

		var numListings = itemListing.parent().children("li.equipped-item").length;
		if (direction === 1 && idx >= numListings - 1) return;
		else if (direction === -1 && idx === 0) return;

		var arrayDirection = -direction;

		$.ajax({
			type: "POST",
			url: "/character/0/dressroom/shift_equipped_item",
			data: { "item_id" : $(this).attr("data-item-id"), "direction" : arrayDirection },
			success: function(res) {
				var d = new Date();
				// refresh image
				$("#outfit-preview").attr("src", "/images/testout.png?" + d.getTime());
				var swapListing = $("li.equipped-item[data-item-id='" + res.results.swapped_item_id + "']");
				console.log(swapListing);
				if (direction === 1) {
					itemListing.before(swapListing);
				}
				else {
					itemListing.after(swapListing);
				}
			},
			error: function(err) {
				console.log(err);
			}
		})
	});

	// user pressed "x" next to equipped item 
	// -> remove from equipped list & update outfit
	$("#equipped-col").on("click", "button.deequip", function(e) {
		var itemListing = $(this).closest(".equipped-item");
		var itemName = itemListing.attr("data-item-name");
		var itemId = itemListing.attr("data-item-id");
		$.ajax({
			type: "POST",
			url: "/character/0/dressroom/toggle_equip_item",
			data: { "item_id" : itemListing.attr("data-item-id") },
			success: function(res) {
				var d = new Date();
				// refresh image
				$("#outfit-preview").attr("src", "/images/testout.png?" + d.getTime());
				// delete self from equipped list
				$("li.equipped-item[data-item-name=" + itemName + "]").remove();
				// remove flag from wardrobe item
				$(".wardrobe-item[data-item-id="+itemId+"]").removeAttr("data-item-in-outfit");
			},
			error: function(err) {
				console.log(err);
			}
		})
	});

	// user clicked item in wardrobe
	$("#wardrobe-col").on("click", ".wardrobe-item", function(e) {
		var itemId =  $(this).attr("data-item-id");
		var itemName = $(this).attr("data-item-name");
		var itemVariety = $(this).attr("data-item-variety");
		var isEquipping = ($(this).attr("data-item-in-outfit") === undefined);

		var equipData = { "item_id": itemId };
		if (isEquipping) {
			equipData["equip_desc"] = { "variety" : itemVariety };
		}

		var wardrobeElement = $(this);
		$.ajax({
			type: "POST",
			url: "/character/0/dressroom/toggle_equip_item",
			data: equipData,
			success: function(res) {
				// TODO: check if item was successfully changed
				//refresh iamge
				var d = new Date();
				$("#outfit-preview").attr("src", "/images/testout.png?" + d.getTime());
				if (isEquipping) {
					$("#equipped-layer-" + res.results.equip_layer + " ul").prepend(createEquippedItemListing({ 
						"id" : itemId, "name" : itemName, "variety" : itemVariety }));
					wardrobeElement.attr("data-item-in-outfit", "true");
				}
				else {
					// delete equipped list item
					$("li.equipped-item[data-item-name=" + itemName + "]").remove();
					// remove flag from wardrobe item
					wardrobeElement.removeAttr("data-item-in-outfit");
				}
			},
			error: function(err) {
				console.log(err);
			}
		});
	});

	$("#save-as-current").click(function(e) {
		$.ajax({
			type: "POST",
			url: "/character/0/dressroom/copy_outfit",
			data: { "src_outfit_name" : "wip", "dst_outfit_name" : "current" },
			success: function(res) {

			},
			error: function(err) {
				console.log(err);
			}
		})
	});
});