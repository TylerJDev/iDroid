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

	// console.log(dataObj);
	// Get the tape topic, and the within that topic tapes
	var treeStructure = {
		parentTopic: {} // Parent Topic > Sub Topic > children of sub topic
		// Example:
		/* parentTopic: {
			'Sub Topic': {
				'Children': {

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
			var textWithColon = text.split(' ').filter(currentWord => currentWord.indexOf(':') >= 0);
			// Split text by \n
			textWithColon = textWithColon.join(' ').split('\n').join(' ').split(' ');

			var linesParsed = text.split('\n')
			var popped = linesParsed.pop();
			linesParsed = linesParsed.map(x => [x.substr(0, x.indexOf(':') + 1), x.substr(x.indexOf(':') + 1, x.length).trim()]);
			if (linesParsed.length > 1) {
				return [true, linesParsed];
			} else {
				return [false];
			}
		}

		/* Sub Topic */
		currentIndexes.map(function(currIndex) {
			var count = 1;
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

		console.log(characters);
		console.log(treeStructure);
		console.log(textPara);
	}

	addTreeStructure();
	dataObj['tree_structure'] = treeStructure;
	return dataObj;
}

loadData();

try {
  module.exports = {parseHTMLData};
} catch (ReferenceError) {
  console.log('Could not export module(s)');
}
