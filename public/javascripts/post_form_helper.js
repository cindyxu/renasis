var emotesList = ["happy", "sad", "tongue", "angry", "surprised", "cool", "oops", "blush", "glum", "sick"];
var bbRaw = "";

var parseForEmotes = function(html) {
	for (var i in emotesList) {
		html = html.replace(new RegExp(":" + emotesList[i] + ":", "g"), '<img class="post-emote" src="/images/emotes/' + emotesList[i] + '.png">');
	}
	return html;
};

var attachPreviewPostButtonListener = function() {
	$("button#preview-post-button").one("click", function(e) {
		e.stopPropagation();
		e.preventDefault();

		var postTextarea = $("textarea#message-bb");
		bbRaw = postTextarea.val();
		var bbRes = XBBCODE.process({ text: bbRaw, removeMisalignedTags: false, addInLineBreaks: true });
		bbRes.html = parseForEmotes(bbRes.html);
		
		$("#post-edit-section").css("display", "none");
		$("#post-preview-section .bubble").html(bbRes.html);
		$("#post-preview-section").css("display", "block");

		$(this).attr("id", "edit-post-button").html("Edit");
		attachEditPostButtonListener();
	});
};

var attachEditPostButtonListener = function() {
	$("button#edit-post-button").one("click", function(e) {
		e.stopPropagation();
		e.preventDefault();

		$("#post-preview-section").css("display", "none");
		$("#post-edit-section").css("display", "block");

		$(this).attr("id", "preview-post-button").html("Preview");
		attachPreviewPostButtonListener();
	});
};
