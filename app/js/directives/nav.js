four51.app.directive('navigation', function() {
	var obj = {
		restrict: 'E',
		templateUrl: 'partials/controls/nav.html',
		controller: 'NavCtrl'
	};
	return obj;
});

four51.app.directive('accountnavigation', function() {
    var obj = {
        restrict: 'E',
        templateUrl: 'partials/controls/accountnav.html',
        controller: 'NavCtrl'
    };
    return obj;
});

four51.app.directive('backStep', function(){
    return {
        restrict: 'A',
        link: function(scope, element, attrs) {
            element.bind('click', function () {
                history.back();
                scope.$apply();
            });
        }
    };
});
// Keeps keyboard focus inside a drawer while it is open: focuses the element marked
// data-msp-autofocus (or the first focusable one) on open, and wraps Tab / Shift+Tab at the
// ends. Returning focus to the trigger on close is NavCtrl.closeDrawer()'s job, since only it
// knows what opened the drawer.
four51.app.directive('mspFocusTrap', ['$timeout', function($timeout) {
	var FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

	return {
		restrict: 'A',
		link: function(scope, element, attrs) {
			var el = element[0];
			var active = false;

			function focusables() {
				return Array.prototype.filter.call(el.querySelectorAll(FOCUSABLE), function(node) {
					return node.offsetWidth || node.offsetHeight || node.getClientRects().length;
				});
			}

			scope.$watch(attrs.mspFocusTrap, function(open) {
				active = !!open;
				if (!active) return;
				// After the open class lands, so the drawer is visible and focusable. preventScroll:
				// the drawer floats over the page, but Chrome still scrolled the PAGE to "reveal" the
				// focused button - recorded live: the sign-in pop-up's button focus jumped the home
				// page from y=0 to y=1332, so the pop-up opened over the middle of the page.
				$timeout(function() {
					var target = el.querySelector('[data-msp-autofocus]') || focusables()[0];
					if (target) target.focus({ preventScroll: true });
				}, 50);
			});

			element.on('keydown', function(e) {
				if (!active || e.keyCode !== 9) return;
				var nodes = focusables();
				if (!nodes.length) return;
				var first = nodes[0], last = nodes[nodes.length - 1];
				if (e.shiftKey && document.activeElement === first) {
					e.preventDefault();
					last.focus({ preventScroll: true });
				}
				else if (!e.shiftKey && document.activeElement === last) {
					e.preventDefault();
					first.focus({ preventScroll: true });
				}
			});
		}
	};
}]);
