// In-page navigation for the one-page layout: header links, the menu drawer, the hero buttons
// and the footer all scroll to a section of the home page (shop, story, faq, contact) instead of
// changing route. Four51Ctrl puts goTo on its scope as goToSection, so every view inherits it.
four51.app.factory('SectionNav', ['$location', '$rootScope', '$timeout', '$window', function($location, $rootScope, $timeout, $window) {
	// The sticky header's real height right now (it varies with logo.height), measured rather than
	// taken from the CSS --msp-header-height estimate, which misses the header's 1px border.
	function headerHeight() {
		var header = document.querySelector('.mt-header-sticky-wrap');
		return header ? header.getBoundingClientRect().height : 0;
	}
	// Page offset that lands the section just below the sticky header. Most sections have their
	// own generous top padding; one without (the story: image and tint start at its edge) would
	// sit flush against the header and read as scrolled too far, so stop short enough to leave
	// about LAND_GAP of air above its content either way.
	var LAND_GAP = 32;
	function targetTop(el) {
		var padding = parseFloat($window.getComputedStyle(el).paddingTop) || 0;
		var gap = Math.max(0, LAND_GAP - padding);
		return Math.max(0, Math.round(el.getBoundingClientRect().top + $window.pageYOffset - headerHeight() - gap));
	}

	function scrollTo(id) {
		if (id === 'top') return $window.scrollTo({ top: 0, behavior: 'smooth' });
		var el = document.getElementById(id);
		if (el) $window.scrollTo({ top: targetTop(el), behavior: 'smooth' });
	}

	function settle(id) {
		var el = document.getElementById(id);
		if (!el) return;
		var top = targetTop(el);
		if (Math.abs($window.pageYOffset - top) > 4) $window.scrollTo({ top: top });
	}

	// Links using this keep a real href to catalog, so opening one in a new tab still works; only
	// a plain click is taken over. preventDefault stops the native navigation racing the handler
	// (the href="#" logout bug in THEME-DEVELOPMENT-NOTES.md). From any other route, go home first
	// and scroll once the view has rendered.
	function goTo(id, $event) {
		if ($event && ($event.metaKey || $event.ctrlKey || $event.shiftKey || $event.button === 1)) return;
		if ($event) $event.preventDefault();

		if ($location.path() === '/catalog') return scrollTo(id);

		var off = $rootScope.$on('$viewContentLoaded', function() {
			off();
			// Let the home page's own content (tree, products) render before measuring.
			$timeout(function() { scrollTo(id); }, 400);
			// Products and images keep arriving after that and push lower sections (FAQ,
			// contact) further down mid-scroll, so the first scroll can land short. Once the page
			// has settled, snap there if it isn't already at the top of the view.
			$timeout(function() { settle(id); }, 1600);
		});
		$location.path('/catalog');
	}

	// Buttons whose destination comes from site.json: "#shop" / "#story" / "#faq" / "#contact"
	// (and the legacy "catalog", meaning the shop) scroll in-page; anything else is a real link.
	function sectionOf(url) {
		if (url === 'catalog') return 'shop';
		return url && url.charAt(0) === '#' ? url.substr(1) : null;
	}
	function href(url) {
		return !url || sectionOf(url) ? 'catalog' : url;
	}
	function follow(url, $event) {
		var section = sectionOf(url);
		if (section) goTo(section, $event);
	}
	function isExternal(url) {
		return !!url && /^https?:/i.test(url);
	}

	return { goTo: goTo, href: href, follow: follow, isExternal: isExternal, sectionOf: sectionOf };
}]);
