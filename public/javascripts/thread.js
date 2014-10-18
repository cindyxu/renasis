$(function() {

	var newPostContainer = $(".post-container#new-post");
	
	$(".post-message").each(function(i, p) {
		p.setAttribute("html", XBBCODE.process({ "text" : p.innerHTML, removeMisalignedTags: false, addInLineBreaks: true }));
	});

	attachPreviewPostButtonListener();

	$("a#new-post-button").click(function(e) {
		if (newPostContainer.hasClass("showing")) {
			newPostContainer.animate({ bottom: "-100%" }, "fast");
			newPostContainer.removeClass("showing");
		} else {
			newPostContainer.animate({ bottom: "0%" }, "fast");	
			newPostContainer.addClass("showing");
			$('html, body').animate({scrollTop: $(document).height()}, 'fast');
		}
		
		return false;
	});

	$("#post-form").submit(function(e) {
		e.preventDefault();
		e.stopPropagation();
		var values = $('#post-form').serialize();
		console.log(window.location.href);
		$.ajax({
			url: window.location.href,
			type: "POST",
			data: values,
			success: function(res) {
				$("#thread").append(res);
			},
			error: function(err) {

			}
		});
	});
	
});