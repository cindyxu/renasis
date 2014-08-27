var updateAvatar = function(newPath) {
	$("#avatar-preview").attr("src", newPath);
};

var inflateEquippedItemListings = function() {
	$(".equipped-item").each(function(i) {
		var itemId = $(this).attr("data-item-id");
		var itemName = $(this).attr("data-item-name");
		dressroomHTMLHelper.createEquippedItemListing(itemId, itemName, $(this));
	});
};

var inflateWardrobeItemListings = function() {
	$(".wardrobe-item").each(function(i) {
		dressroomHTMLHelper.createWardrobeItemThumbListing(
			$(this).attr("data-item-id"),
			$(this).attr("data-item-name"),
			$(this).attr("data-item-layer"),
			$(this)
		);
	});
};

var populateWardrobeItemListings = function(wardrobeItems) {
	var listul = $("#subcategory-items ul");
	listul.empty();
	for (var charId in wardrobeItems) {
		var charItems = wardrobeItems[charId];
		for (var i = 0; i < charItems.length; i++) {
			var charItem = charItems[i];
			listul.append(dressroomHTMLHelper.createWardrobeItemThumbListing(charItem._id, charItem.name, charItem.layer));
		}
	}
};

var dressroomHTMLHelper = {
	createEquippedItemListing: function(itemId, itemName, li) {
		var listing = li || $("<li>");
		listing.attr("data-item-id", itemId);
		listing.attr("data-item-name", itemName);
		listing.addClass("equipped-item");
		
		var listingName = $("<span>");
		listingName.attr("name", itemName).html(itemName);
		listing.append(listingName);
		
		var actions = $("<div class=\"actions\">");

		var deequipButton = $("<button>");
		deequipButton.attr("data-item-id", itemId).attr("data-item-name", itemName).addClass("deequip").html("x");
		
		actions.append(deequipButton);
		listing.append(actions);
		
		return listing;
	},

	createWardrobeItemThumbListing: function(itemId, itemName, itemLayer, li) {
		var listing = li || $("<li>");
		listing.attr("data-item-id", itemId);
		listing.attr("data-item-name", itemName);
		listing.attr("data-item-layer", itemLayer);
		listing.addClass("wardrobe-item");

		var thumb = $("<img>");
		thumb.attr("src", "/images/" + itemName + "_thumb.png");
		listing.append(thumb);
		return listing;
	}

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
		$.ajax({
			type: "POST",
			url: "/character/0/dressroom/toggle_equip_item",
			data: { "item_id" : $(this).attr("data-item-id"), forceRemove : true },
			success: function(res) {
				var d = new Date();
				$("#avatar-preview").attr("src", "/images/testout.png?" + d.getTime());
				$("li.equipped-item[data-item-name=" + itemName + "]").remove();
			}
		})
	});

	// user clicked item in wardrobe
	// -> toggle equipped state & update avatar
	$("#wardrobe-col").on("click", ".wardrobe-item", function(e) {
		var itemId =  $(this).attr("data-item-id");
		var itemName = $(this).attr("data-item-name");
		var itemCat = $(this).attr("data-item-layer");
		$.ajax({
			type: "POST",
			url: "/character/0/dressroom/toggle_equip_item",
			data: { "item_id": itemId },
			success: function(res) {
				//refresh iamge
				var d = new Date();
				$("#avatar-preview").attr("src", "/images/testout.png?" + d.getTime());
				if (res.removed) {
					$("li.equipped-item[data-item-name=" + itemName + "]").remove();
				}
				else {
					$("li.equipped-layer[data-layer=" + itemCat + "] ul").prepend(dressroomHTMLHelper.createEquippedItemListing(itemId, itemName));
				}
				
				/*
				$("#equipped-items > ul").empty();
				for (var cat in res.equipped) {
					var catItems = res.equipped[cat];
					var catList = $("<li>", { "data-cat" : cat, class: "equipped-item-layer" });
					var catul = catList.append($("<ul>"));
					for (var i = catItems.length-1; i >= 0; i--) {
						catul.append($("<li>", { "text" : catItems[i].name }));
					}
				}
				$("#equipped-items ul").append(catList);
				*/
			}
		});
	});

});