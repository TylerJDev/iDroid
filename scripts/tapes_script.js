// ID of page to get
const pageID = '49536';
const dataObj = {
	'elements_from_start': '',
	'start_section': '', // Heading of section
	'tree_structure': {}
}

function loadData() {
	$.ajax(`https://metalgear.wikia.com/api.php?format=json&action=query&prop=revisions&rvprop=content&pageids=${pageID}&rvparse=1`, { // Add &rvparse=1 for html response
		dataType: 'jsonp'
	})
	.done(function (data) {
		// Check if data is valid
		try {
			if (data.query.pages[pageID].revisions.length) {
				console.log('Data loaded');
				// Pass data HTML (text) to function
				parseHTMLData(data.query.pages[pageID].revisions[0]['*']);
			}
		} catch(err) { // if data.query.pages ... can't be found, i.e, no length
		console.log(`Error: ${err.name}\nFailed to get data.`);
	}
})
.fail(function() {
	console.log('Failed to get data');
});
}

function parseHTMLData(data) {
	var dataHTML = $(data);

	// Find the index of the heading that contains "Info Tapes"
	var indexHeading = Object.values(dataHTML).indexOf(dataHTML.filter('h2:contains("Info Tapes")')[0]); // -1 for including this heading

	// Get all elements starting from indexHeading (index)
	var fromStart = Object.values(dataHTML).filter((currItem, currCount) => currCount > indexHeading);

	dataObj['elements_from_start'] = fromStart;

	// Confirm element from index is h2
	dataObj['start_section'] = $(Object.values(dataHTML)[indexHeading]).is('h2') ?  Object.values(dataHTML)[indexHeading] : '';

	// Get the tape topic, and the within that topic tapes
	var treeStructure = {
		parentTopic: {} // Parent Topic > Sub Topic > children of sub topic
		// Example:
		/* parentTopic: {
		'Sub Topic': {
		'Children': {
		['array of conversation']
	}
}
} */
}

function addTreeStructure() {
	var currentIndexes = [];
	var characters = [];
	var textPara = [];

	function checkCharacter(char, ele) {
		var eleChild = ele.children('b').text();
		// If the only element in the <p> tag is the <b> text...
		if (!eleChild.replace(char, '').length) {
			return false;
		}
		return true;
	}

	/* Parent Topic */
	Object.values($(dataObj['elements_from_start']).filter('h3')).map(function(currElem) {
		if ($(currElem).length === 1 && $(currElem).text().length) { // jQuery returns object of all filtered H3 elements at the end, this ensures that currElem is always 1 && ensure element has text content within

			// Dev-Note: ## If dataObj[...].filter(...) length IS only 1, this will most likely lead to a duplicate
			treeStructure.parentTopic[$(currElem).children('span.mw-headline').text().trim()] = {};
			currentIndexes.push(dataObj['elements_from_start'].indexOf(currElem));
		}
	});

	// Used to parse text the contains entire conversation, instead of broken up into multiple elements
	function checkText(text) {
		// Split text by \n
		var linesParsed = text.split('\n')
		linesParsed.pop();

		linesParsed = linesParsed.map(x => [x.substr(0, x.indexOf(':') + 1), x.substr(x.indexOf(':') + 1, x.length).trim()]);
		if (linesParsed.length > 1) {
			return [true, linesParsed];
		} else {
			return [false];
		}
	}

	/* Sub Topic */
	currentIndexes.map(function(currIndex) {
		var currElems = dataObj['elements_from_start'];
		var mostRecentSubTopic = '';

		// If this is the last 'h3', make prevTopicIndex the total amount of elements within array, else make it the index of the next 'h3'
		var prevTopicIndex = currentIndexes[currentIndexes.indexOf(currIndex) + 1] === undefined ? dataObj['elements_from_start'].length : currentIndexes[currentIndexes.indexOf(currIndex) + 1];

		var subTopicContent = Object.values(currElems).filter((currItem, currCount) => currCount > currIndex && currCount < prevTopicIndex);

		var currentParentTopic = $(dataObj['elements_from_start'][currIndex]).children('span.mw-headline').text().trim();
		subTopicContent.map(function(this_index) {
			// Subtopic "heading"
			if (this_index.nodeName === 'H4') {
				treeStructure.parentTopic[currentParentTopic][$(this_index).children('span.mw-headline').text().trim()] = [];
				mostRecentSubTopic = $(this_index).children('span.mw-headline').text().trim();
			} else if (this_index.nodeName === 'P') { // Subtopic text
				var character = $(this_index).children('b').eq(0).text().trim();
				var charChecked = checkCharacter(character, $(this_index));
				var parsedText = [false];

				if (characters.indexOf(character) === -1 && charChecked === true) {
					characters.push(character);
				}

				// If this contains multiple characters within one <p> element ...
				if ($(this_index).children('b').length > 1) {
					textPara.push($(this_index));
					parsedText = checkText($(this_index).text());
				}

				if (!parsedText[0]) {
					treeStructure.parentTopic[currentParentTopic][mostRecentSubTopic].push([{[character]: $(this_index).text().replace(character, '').trim()}]);
				} else {
					parsedText[1].map(function(currentParsed) {
						treeStructure.parentTopic[currentParentTopic][mostRecentSubTopic].push([{[currentParsed[0]]: currentParsed[1]}]);
					});
				}
			}
		});
	});
}

addTreeStructure();
dataObj['tree_structure'] = treeStructure;


// DOM Manipulation
displayData(dataObj);
return dataObj;
}

// Init
loadData();

// Function used to display the data visually on the page
function displayData(data) {
	// Add the "parent topic" to the first column
	Object.keys(data['tree_structure'].parentTopic).map(currTopic => $('#column_1_tapes').append(`<button class="topic_tape">${currTopic}</button>`));

	$('.topic_tape').click(function() {
		// Remove "active" class from previously selected button(s)
		$('.active_topic').removeClass('active_topic');

		// Get the topic name
		var this_topic = $(this).text();

		// Clear the subtopic column
		$('#column_2_tapes').empty();
		Object.keys(data['tree_structure'].parentTopic[this_topic]).map(currSubTopic => $('#column_2_tapes').append(`<button class="topic_tape">${currSubTopic} <span class="sub_topic_playing">[<i class="fas fa-volume-up"></i>]</span></button>`));

		// Add "active" class
		$(this).addClass('active_topic');
	});

	// Accessibility
	$('#main_body').on('keydown', 'button.topic_tape', function(currKeyPressed) {
		var parentColumn = $(this).parents('.column').siblings().eq(0);
		if (currKeyPressed.keyCode === 37 || currKeyPressed.keyCode === 39) {
			// Focus first child button of parentColumn || current selected element
			var focusTo = parentColumn.find('button.active_topic');

			if (!focusTo.length) {
				focusTo = parentColumn.find('button.topic_tape').eq(0);
			}

			focusTo.focus();
			console.log(parentColumn.find('button.topic_tape').eq(0));
			currKeyPressed.preventDefault();
		}
	});

	$('#activeToContinue').click(function() {
		$('#dialogueBox > .inner_box').click();
	})

	$('#column_2').on('click', 'button.topic_tape', function() {
		var this_parent_topic = $('#column_1 .active_topic').text();

		if (!$(this).hasClass('active_topic')) {
			// Remove "active" class from previously selected button(s)
			$('#column_2 .active_topic').removeClass('active_topic');
			$('.active_playing').removeClass('active_playing');
			$('.disabled_control').removeClass('disabled_control');
			$('#box_settings .btn_settings > button').removeAttr('aria-hidden tabindex');


			// Add active class
			$(this).addClass('active_topic');
			$(this).children('.sub_topic_playing').addClass('active_playing');

			$('#progress_current').css('width', '0%');
			$('#current_tape_heading').text($(this).text().replace(/[[]]/gi, '').trim());

			// Play the tape
			playTheTape(data['tree_structure'].parentTopic[this_parent_topic][$(this).text().replace(/[[]]/gi, '').trim()]);

			// Focus to button
			$('#dialogueBox #activeToContinue').focus();
		}
	});
}

function playTheTape(tapeArr) {
	// Split the tape conversations into sentences if exceeds x amount
	var splitConvo = tapeArr.map(function(currArrItem) {
		var currentKey = Object.keys(currArrItem[0]);

		// If exceeds x amount ..
		if (currArrItem[0][currentKey].length > 150) {
			var splitBy = currArrItem[0][currentKey].split('. '); // Split by 'sentence. '
			var splitArr = []; // Holds the sentences
			var currCount = -1; // Keeps track of map function

			splitBy.map(function(currSentence) {
				//.log(currSentence[0]);
				if (currSentence[0] === currSentence[0].toLowerCase()) {
					if (splitArr[currCount] !== undefined) {
						splitArr[currCount] = [currentKey[0], splitArr[currCount] + ' ' + currSentence + '.'];

						// Remove duplicate name
						var currReg = new RegExp(currentKey[0] + ',', 'gi');
						splitArr[currCount][1] = splitArr[currCount][1].replace(currReg, '');

					}
				} else {
					splitArr.push([currentKey[0], currSentence + '.']);
					currCount += 1;
				}
			});

			return splitArr;
		} else {
			return [currentKey[0], currArrItem[0][currentKey]];
		}
	});

	// Flatten the array
	var newArr = [];
	splitConvo.filter(function(curr) {
		//if (curr.length > 2) {
		if (typeof curr[0] === 'object') {
			curr.map(x => newArr.push(x));
		} else {
			newArr.push(curr);
		}
	});

	$('#current_progress #current_length').text(newArr.length);
	$('#current_progress #current_now').text('1');
	function getCurrVal(max, curr) {
		var currMax = max;
		var curVal = curr;
		return parseInt(100.0 / Math.floor(currMax) * Math.floor(curVal) + 0.5);
	}

	$('#progress_current').css('width', getCurrVal(newArr.length, 1) + '%');

	// Get current speaker
	//var currentSpeaker = Object.keys(tapeArr[0][0])[0];
	var currentSpeaker = newArr[0][0]

	function determineFontSize(str) {
		if (str.length > 245) {
			$('#dialogueBox h2.current_text').addClass('length_text');
		} else {
			$('#dialogueBox h2.current_text').removeClass('length_text');
		}
	}

	// Append content to "text box"
	determineFontSize(newArr[0][1]);
	$('.current_text').text(currentSpeaker + ' ' + newArr[0][1]);


	var currentDialogueCount = 1;
	// On click of dialogue box, change text

	function changeText(subtract=false) {
		if (currentDialogueCount < newArr.length) {
			if (subtract && currentDialogueCount !== 0) {
				currentDialogueCount--;
			}

			var currSpeaker = newArr[currentDialogueCount][0]
			$('#current_progress #current_now').text(currentDialogueCount + 1);
			$('#progress_current').css('width', getCurrVal(newArr.length, currentDialogueCount + 1) + '%');

			// If character length too long ...
			determineFontSize(newArr[currentDialogueCount][1]);
			$('#dialogueBox h2.current_text').text(currSpeaker + ' ' +  newArr[currentDialogueCount][1]);
			if (subtract === false) {
				currentDialogueCount++;
			}
		}
	}

	$('#dialogueBox  > .inner_box').click(function() {
		changeText();
	});

	$('#back_btn').click(function() {
		changeText(true);
	});

	$('#activeToStop').click(function() {
		currentDialogueCount = newArr.length;

		// Reset everything
		$('#current_progress #current_now, #current_progress #current_length').text('0');
		$('#progress_current').css('width', '0%');
		$('#dialogueBox h2.current_text').text('');
		$('#column_2 .active_playing').removeClass('active_playing');

		$('#box_settings .btn_settings *').addClass('disabled_control');
		$('#box_settings .btn_settings > button').attr({'aria-hidden': 'true', 'tabindex': '-1'});
	});

	$('#stop_btn').click(function() {
		$('#activeToStop').click();
	});

}

// For working time
(function() {
	var colon = ':';
	setInterval(function() {
		var currDate = new Date;
		var currHour = currDate.getHours();
		var currMins = currDate.getMinutes();

		if ($('#current_time').text().indexOf(':') >= 0) {
			colon = ' ';
		} else {
			colon = ':';
		}

		if (currMins < 10) {
			currMins =  + '0' + currMins.toString();
		}

		$('#current_time').text(`${currHour}${colon}${currMins}`);
	}, 1000)
})();

// Replicate behavior of pressing "continue" button
$('body').on('keydown', function(curr_key) {
	if (curr_key.keyCode === 13) {
		if (!$('#activeToContinue').hasClass('disabled_control')) {
			$('#activeToContinue').click();
		}
	}
});

// Replicate behavior of pressing "S" button
$('body').on('keydown', function(curr_key) {
	if (curr_key.keyCode === 32) {
		if (!$('#activeToStop').hasClass('disabled_control')) {
			$('#activeToStop').click();
		}
	}
});

try {
	module.exports = {parseHTMLData};
} catch (ReferenceError) {
	console.log('Could not export module(s)');
}
