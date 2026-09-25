// In-page navigation for the one-page layout: header links, the menu drawer, the hero buttons
// and the footer all scroll to a section of the home page (shop, story, faq, contact) instead of
// changing route. Four51Ctrl puts goTo on its scope as goToSection, so every view inherits it.
four51.app.factory('SectionNav', ['$location', '$rootScope', '$timeout', '$window', function($location, $rootScope, $timeout, $window) {
	function scrollTo(id) {
		if (id === 'top') return $window.scrollTo({ top: 0, behavior: 'smooth' });
		var el = document.getElementById(id);
		if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
	}

	function settle(id) {
		var el = document.getElementById(id);
		if (!el) return;
		var header = document.querySelector('.mt-header-sticky-wrap');
		var target = header ? header.getBoundingClientRect().height : 0;
		if (Math.abs(el.getBoundingClientRect().top - target) > 24) el.scrollIntoView({ block: 'start' });
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
