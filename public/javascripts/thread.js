$(function() {

	var newPostContainer = $("#new-post");
	var selectedSkillElem;

	var togglePostForm = function(show) {
		if (show === false || newPostContainer.hasClass("showing")) {
			newPostContainer.animate({ bottom: "-100%" }, "fast");
			newPostContainer.removeClass("showing");
		} else if (show === true || !newPostContainer.hasClass("showing")) {
			newPostContainer.animate({ bottom: "0%" }, "fast");	
			newPostContainer.addClass("showing");
			$('html, body').animate({scrollTop: $(document).height()}, 'fast');
		}
	};

	var populateSkills = function(skills) {
		var skillsContainer = $("#battle-actions-skills");
		skillsContainer.empty();
		for (var i = 0; i < skills.length; i++) {
			skillsContainer.append($("<img class=\"select-skill\" data-skill-id=\"" + skills[i].skill_id + "\" src=\"/images/" + skills[i].skill_name + ".png\">"));
		}
	};
	
	$(".post-message").each(function(i, p) {
		p.setAttribute("html", XBBCODE.process({ "text" : p.innerHTML, removeMisalignedTags: false, addInLineBreaks: true }));
	});

	attachPreviewPostButtonListener();

	$("a#new-post-link").click(function(e) {
		togglePostForm();
		return false;
	});

	$(".select-skill").click(function(e) {
		$("#battle-action-context").val("battle");
		$("#battle-action").val("skill");
		$("#battle-action-selection").val($(this).attr("data-skill-id"));
		$(this).addClass("selected-skill");
		if (selectedSkillElem) selectedSkillElem.removeClass("selected-skill");
		selectedSkillElem = $(this);
	});

	$("#post-form").submit(function(e) {
		e.preventDefault();
		e.stopPropagation();
		$.ajax({
			url: window.location.href,
			type: "POST",
			data: $(this).serializeJSON(),
			success: function(res) {
				$("#thread").append($(res.postContent));
				populateSkills(res.skills);
			},
			error: function(err) {

			}
		});
		//togglePostForm(false);
	});
	
});