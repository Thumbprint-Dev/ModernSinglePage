// Per-site branding that the platform gives us nowhere to put -- the home page
// hero art and copy, and a nav logo for sites whose Company.LogoUrl is empty.
// Lives in site.json beside index.html so a site can be rebranded by editing one
// deployed file, with no theme fork and no CMS behind it.
four51.app.factory('SiteConfig', ['$http', '$log', function($http, $log) {
	// The shape of site.json, and the fallback for every key in it. A missing,
	// truncated or partially filled file therefore still renders the stock theme
	// rather than an empty hero.
	var settings = {
		logo: {
			url: '',
			alt: ''
		},
		hero: {
			image: '',
			eyebrow: 'Fall 2026 Collection',
			heading: 'Gear your team for the season ahead.',
			subheading: 'New apparel, drinkware and print kits, priced for your group.',
			buttonText: 'Shop the collection',
			buttonHref: 'catalog'
		},
		// Applied to the hero element by ngStyle; recomputed whenever the file lands.
		heroStyle: {}
	};

	// One level deep, and blanks are ignored -- a site only names the keys it
	// actually overrides, and clearing a value back to "" restores the default.
	function apply(data) {
		angular.forEach(settings, function(defaults, section) {
			var overrides = data && data[section];
			if (!angular.isObject(defaults) || !angular.isObject(overrides)) return;

			angular.forEach(defaults, function(value, key) {
				if (angular.isString(overrides[key]) && overrides[key] !== '') defaults[key] = overrides[key];
			});
		});

		settings.heroStyle = settings.hero.image
			? { 'background-image': "url('" + settings.hero.image + "')" }
			: {};
	}

	// Templates bind to this same object, so they pick the values up when the
	// request resolves. The URL is relative to <base href>, i.e. the deployed app
	// folder -- the same way partials are loaded.
	var loaded = $http.get('site.json', { cache: true }).then(function(response) {
		apply(response.data);
		return settings;
	}, function() {
		// Not an error worth stopping for: a site that never added the file just
		// gets the theme defaults.
		$log.warn('SiteConfig: site.json missing or unreadable -- using theme defaults');
		return settings;
	});

	return {
		settings: settings,
		loaded: loaded
	};
}]);
