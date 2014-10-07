var emotesList = ["happy", "sad", "tongue", "angry", "surprised", "cool", "oops", "blush", "glum", "sick"];
var bbRaw = "";

var parseForEmotes = function(html) {
	for (var i in emotesList) {
		html = html.replace(new RegExp(":" + emotesList[i] + ":", "g"), '<img class="post-emote" src="/images/emotes/' + emotesList[i] + '.png">');
	}
	return html;
};

var attachPreviewPostButtonListener = function(pb) {
	pb.one("click", function(e) {
		e.stopPropagation();
		e.preventDefault();

		var postTextarea = $("textarea#new-post-message-bb");
		bbRaw = postTextarea.val();
		var bbRes = XBBCODE.process({ text: bbRaw, removeMisalignedTags: false, addInLineBreaks: true });
		bbRes.html = parseForEmotes(bbRes.html);
		
		$("#new-post-edit").css("display", "none");
		$("#new-post-preview").html(bbRes.html);
		$("#new-post-preview").css("display", "block");

		pb.attr("id", "edit-new-post").html("Edit");
		attachEditPostButtonListener(pb);
	});
};

var attachEditPostButtonListener = function(pb) {
	pb.one("click", function(e) {
		e.stopPropagation();
		e.preventDefault();

		$("#new-post-preview").css("display", "none");
		$("#new-post-edit").css("display", "block");

		pb.attr("id", "preview-new-post").html("Preview");
		attachPreviewPostButtonListener(pb);
	});
};

var buildEmotesElem = function() {
	var emotesElem = $('<div id="post-emotes">');
	for (var i = 0; i < emotesList.length; i++) {
		var emoteLink = $('<a href="' + emotesList[i] + '">');
		var emoteImg = $('<img src="/images/emotes/' + emotesList[i] + '.png">');
		emoteLink.append(emoteImg);
		emotesElem.append(emoteLink);
	}
	return emotesElem;
};

var buildNewPostForm = function() {
	var postForm = $("<form id='new-post-form'>");

	var postEdit = $('<div id="new-post-edit">');
	postEdit.append(buildEmotesElem());
	postEdit.append($('<textarea id="new-post-message-bb" placeHolder="Write something!">'));
	postForm.append(postEdit);

	postForm.append($('<div id="new-post-preview">'));
	
	var previewButton = $('<button id="preview-new-post">').html("Preview");
	postForm.append(previewButton);
	attachPreviewPostButtonListener(previewButton);

	postForm.append($('<button id="submit-new-post">').html("Submit"));

	return postForm;
};

var buildNewPostFormContainer = function() {
	var postCount = $(".post-container").length;

	var postContainer = $('<div class="post-container ' +
		(postCount % 2 === 0 ? "left" : "right") +
		'">');
	postContainer.css("padding-left", "140px");
	postContainer.css("position", "fixed");
	postContainer.css("bottom", "0");
	postContainer.css("width", "100%");
	postContainer.css("background-color", "black");
	var avatarElem = $('<div class="avatar">');
	avatarElem.append($('<img src="/images/testout.png">'));
	postContainer.append(avatarElem);

	var postElem = $('<div class="post">');
	postContainer.append(postElem);

	postElem.append(buildNewPostForm);
	
	return postContainer;
};

$(function() {
	$("a#new-post").click(function(e) {

		if ($("#new-post-preview").parents(".post-container").length === 0) {
			var postContainer = buildNewPostFormContainer();
			// scroll down & slide down
			$("#right-column").append(postContainer);
			postContainer.css("bottom", "-100%");
			postContainer.animate({ bottom: "0%" }, "fast");
		}
		
		$('html, body').animate({scrollTop: $(document).height()}, 'fast');
		return false;
	});
});