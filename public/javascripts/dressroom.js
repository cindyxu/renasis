var updateAvatar = function(newPath) {
	$("#avatar-preview").attr("src", newPath);
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

	var deequipButton = $("<button>");
	deequipButton.attr("data-item-id", itemId)
		.attr("data-item-name", itemName)
		.addClass("deequip")
		.addClass("hover-pointer")
		.html("x");
	
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
			}
		});
	});

	// user pressed "x" next to equipped item 
	// -> remove from equipped list & update avatar
	$("#equipped-col").on("click", "button.deequip", function(e) {
		var itemName = $(this).attr("data-item-name");
		var itemId = $(this).attr("data-item-id");
		$.ajax({
			type: "POST",
			url: "/character/0/dressroom/toggle_equip_item",
			data: { "item_id" : $(this).attr("data-item-id") },
			success: function(res) {
				var d = new Date();
				// refresh image
				$("#avatar-preview").attr("src", "/images/testout.png?" + d.getTime());
				// delete self from equipped list
				$("li.equipped-item[data-item-name=" + itemName + "]").remove();
				// remove flag from wardrobe item
				$(".wardrobe-item[data-item-id="+itemId+"]").removeAttr("data-item-in-outfit");
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
			equipData["equip_attrs"] = { "variety" : itemVariety };
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
				$("#avatar-preview").attr("src", "/images/testout.png?" + d.getTime());
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

});