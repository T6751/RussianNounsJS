﻿(function() {
	angular.module('testing', []);

	angular.module('testing').controller('TestRunnerController', TestRunnerController);

	TestRunnerController.$inject = [
		'$scope'
	];

	function TestRunnerController(
		$scope
	) {

		const abc = "абвгдежзийклмнопрстуфхцчшщъыьэюя".split('');
		const parts = [];
		parts.push(abc.slice(0, 5));
		parts.push(abc.slice(5, 12));
		parts.push(abc.slice(12, 18));
		parts.push(abc.slice(18, abc.length));

		$scope.loadingStatuses = [
			_(parts[0].length).times(function(){ return null; }),
			_(parts[1].length).times(function(){ return null; }),
			_(parts[2].length).times(function(){ return null; }),
			_(parts[3].length).times(function(){ return null; })
		];

		$scope.results = [[], [], [], []];
		$scope.completed = [false, false, false, false];

		$scope.workers = [];
		$scope.workers.push(new Worker('js/test.js'));
		$scope.workers.push(new Worker('js/test.js'));
		$scope.workers.push(new Worker('js/test.js'));
		$scope.workers.push(new Worker('js/test.js'));

		$scope.runLetter = (workerIndex, letterIndex) => {
			var worker = $scope.workers[workerIndex];
			var letter = parts[workerIndex][letterIndex];
			if (!letter) {
				throw 'Out of bound of letter list index.';
			}
			jQuery.get('opencorpora-testing/nouns_singular_' + letter + '.json', function (words) {
				worker.postMessage({
					type: 'start',
					words: words,
					workerIndex: workerIndex,
					letterIndex: letterIndex
				});
			});
		};

		$scope.listenEvents = workerIndex => {
			$scope.workers[workerIndex].onmessage = function(e) {
				if (e.data.type === 'loading') {
					$scope.loadingStatuses[e.data.workerIndex][e.data.letterIndex] = e.data;
					$scope.updateLoading($scope.calculateLoading());
				} else if (e.data.type === 'testResult') {
					console.log('' + parts[e.data.workerIndex][e.data.letterIndex] + ' completed');
					$scope.results[e.data.workerIndex][e.data.letterIndex] = e.data;
					var next = e.data.letterIndex + 1;
					if (parts[e.data.workerIndex].length > next) {
						$scope.runLetter(e.data.workerIndex, next);
					} else {
						console.log(new Date(), 'Process ' + (1 + e.data.workerIndex) + ' completed');
						$scope.completed[e.data.workerIndex] = true;
						if ($scope.completed.every(x => x)) {
							$scope.$apply(() => {
								$scope.showResults();
							});
						}
					}
				}
			};
		};

		$scope.showResults = () => {
			console.log(new Date(), 'Finish.');
			let totalCases = 0;
			let wrongCases = 0;
			let totalWords = 0;
			let correctWordsWithWarnings = 0;
			let wrongWords = 0;
			let items = [];

			let itemLen = 0;

			for (let eArray of $scope.results) {
				for (let data of eArray) {
					totalCases += data.totalCases;
					wrongCases += data.wrongCases;
					totalWords += data.totalWords;
					correctWordsWithWarnings += data.correctWordsWithWarnings;
					wrongWords += data.wrongWords;
					items = items.concat(data.resultForTemplate.items);
					itemLen += data.resultForTemplate.items.length;
				}
			}

			console.log('---------------');
			console.log(itemLen);
			console.log(items.length);
			console.log('---------------');
			console.log(items);

			$scope.items = items;
			$scope.itemsViewPosition = 0;
			$scope.updateItemsView();

			$scope.wordsCorrect = totalWords - wrongWords;
			$scope.wordsTotal = totalWords;
			$scope.wordsCorrectShare = $scope.wordsCorrect / $scope.wordsTotal * 100;

			$scope.wordFormsCorrect = totalCases - wrongCases;
			$scope.wordFormsTotal = totalCases;
			$scope.wordFormsCorrectShare = $scope.wordFormsCorrect / $scope.wordFormsTotal * 100;

			$scope.wordsHasWarnings = correctWordsWithWarnings;
			$scope.wordsHasWarningsShare = correctWordsWithWarnings / totalWords * 100;
		};

		$scope.itemsViewPageSize = 10;

		$scope.updateItemsView = () => {
			if (($scope.itemsViewPosition == null) || !($scope.items instanceof Array)) {
				return;
			}
			$scope.itemsView = $scope.items.slice(
				$scope.itemsViewPosition,
				$scope.itemsViewPosition + $scope.itemsViewPageSize
			);
		};

		$scope.calculateLoading = () => {
			let count = 0;
			let sum = 0;
			for (var i = 0; i < $scope.loadingStatuses.length; i++) {
				var arr = $scope.loadingStatuses[i];
				for (var j = 0; j < arr.length; j++) {
					if (arr[j]) {
						sum += arr[j].status;
					}
					count++;
				}
			}
			return sum/count;
		};

		$scope.updateLoading = (loadStatus) => {
			let barWidth = '' + Math.round(100 * loadStatus) + '%';
			jQuery('#loadingBar .status').css('width', barWidth);
		};

		console.log(new Date(), 'Start.');
		for (let w = 0; w < $scope.workers.length; w++) {
			$scope.listenEvents(w);
			$scope.runLetter(w, 0);
		}

		$scope.genderColor = (item) => {
			const g = item.gender.toLowerCase();
			if (g.startsWith('м')) { return "#df5"; }
			if (g.startsWith('ж')) { return "#9f5"; }
			if (g.startsWith('с')) { return "#f59"; }
			return "#000";
		};

		$scope.declensionColor = (item) => {
			const d = item.declension;
			if (d === '') { return '#999999'; }
			if (d === 1) { return '#3ef481'; }
			if (d === 2) { return '#96f43e'; }
			if (d === 3) { return '#f3f43e'; }
			return '#fff';
		};

		$scope.toPreviousPage = () => {
			let newValue = $scope.itemsViewPosition - $scope.itemsViewPageSize;
			$scope.itemsViewPosition = (newValue < 0) ? 0 : newValue;
			$scope.updateItemsView();
		};

		$scope.toNextPage = () => {
			let lastPossibleValueOnThePageNow = $scope.itemsViewPosition + $scope.itemsViewPageSize - 1;
			if (lastPossibleValueOnThePageNow >= ($scope.items.length - 1)) {
				return;
			}
			$scope.itemsViewPosition = $scope.itemsViewPosition + $scope.itemsViewPageSize;
			$scope.updateItemsView();
		};
	}
})();
