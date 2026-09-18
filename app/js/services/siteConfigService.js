// Per-site branding that the platform gives us nowhere to put -- the home page
// hero art and copy, and a nav logo for sites whose Company.LogoUrl is empty.
// Lives in site.json beside index.html so a site can be rebranded by editing one
// deployed file, with no theme fork and no CMS behind it.
four51.app.factory('SiteConfig', ['$http', '$log', '$document', function($http, $log, $document) {
	// The shape of site.json, and the fallback for every key in it. A missing,
	// truncated or partially filled file therefore still renders the stock theme
	// rather than an empty hero.
	var settings = {
		// Falls back to Company.Name once a user loads, but the login page has no user yet -
		// this is what the logo's alt text and its no-logo-uploaded text fallback use there.
		name: '',
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
		login: {
			// Where "Need an account?" goes. Blank uses the native self-service
			// signup at /admin (partials/userView.html in its TempCustomer branch),
			// which only works on sites that hand anonymous visitors a temp
			// session -- elsewhere, point this at the site's Four51 signup link.
			createAccountUrl: ''
		},
		theme: {
			// Overrides --mt-color-accent / --mt-color-accent-dark from custom.css.
			// Leave blank to keep the theme's own accent.
			accent: '',
			accentDark: ''
		},
		// Applied to the hero element by ngStyle; recomputed whenever the file lands.
		heroStyle: {}
	};

	// Anything here is written into a CSS custom property, so keep it to values
	// that are unambiguously colours -- no url(), no semicolons, nothing that
	// could carry extra declarations along with it.
	var COLOR = /^(#[0-9a-f]{3}|#[0-9a-f]{6}|rgba?\([\d\s.,%]+\)|hsla?\([\d\s.,%]+\)|[a-z]{3,20})$/i;

	function isColor(value) {
		return angular.isString(value) && COLOR.test(value.trim());
	}

	// Hover/pressed states need a darker sibling. Deriving it means a site only
	// has to name one colour; accentDark is there for when the brand has a
	// specific second shade.
	function darken(hex, amount) {
		if (!/^#[0-9a-f]{6}$/i.test(hex)) return hex;

		var channels = [1, 3, 5].map(function(i) {
			var value = Math.round(parseInt(hex.substr(i, 2), 16) * (1 - amount));
			return ('0' + value.toString(16)).slice(-2);
		});
		return '#' + channels.join('');
	}

	// Set on <html>, where an inline style beats the :root rule in custom.css --
	// so the stylesheet keeps the theme default and this only has to name what
	// the site changes.
	function applyTheme() {
		var root = $document[0].documentElement;
		var accent = (settings.theme.accent || '').trim();
		var accentDark = (settings.theme.accentDark || '').trim();

		if (accent && !isColor(accent)) {
			$log.warn('SiteConfig: theme.accent is not a colour, ignoring -- ' + accent);
			return;
		}
		if (!accent) return;

		root.style.setProperty('--mt-color-accent', accent);
		root.style.setProperty('--mt-color-accent-dark', isColor(accentDark) ? accentDark : darken(accent, 0.18));
	}

	// One level deep, and blanks are ignored -- a site only names the keys it
	// actually overrides, and clearing a value back to "" restores the default.
	function apply(data) {
		if (data && angular.isString(data.name) && data.name !== '') settings.name = data.name;

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

		applyTheme();
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