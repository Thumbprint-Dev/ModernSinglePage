four51.app.directive('ngMatch', ['$parse', function($parse) {
	var obj = {
		restrict: 'A',
		require: '?ngModel',
		link: function(scope, elem, attrs, ctrl) {
			if (!ctrl) return;
			if (!attrs['ngMatch']) return;

			var firstPassword = $parse(attrs['ngMatch']);

			var validator = function (value) {
				var temp = firstPassword(scope),
					// An empty confirm field is always valid - only flag a real mismatch once
					// the shopper has actually typed something to confirm. Without this, a
					// strict value === temp compare could fail before any input (e.g. if the
					// user record's Password field comes back as '' while ConfirmPassword is
					// still undefined), showing "Passwords do not match!" on page load.
					v = !value || value === temp;
				ctrl.$setValidity('match', v);
				return value;
			}

			ctrl.$parsers.unshift(validator);
			ctrl.$formatters.push(validator);
			attrs.$observe('ngMatch', function () {
				validator(ctrl.$viewValue);
			});
		}
	};
	return obj;
}]);