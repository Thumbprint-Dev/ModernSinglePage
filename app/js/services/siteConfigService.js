// Per-site branding that the platform gives us nowhere to put -- the home page
// hero art and copy, and a nav logo for sites whose Company.LogoUrl is empty.
// Lives in site.json beside index.html so a site can be rebranded by editing one
// deployed file, with no theme fork and no CMS behind it.
four51.app.factory('SiteConfig', ['$http', '$log', '$document', function($http, $log, $document) {
	// The shape of site.json, and the fallback for every key in it. A missing,
	// truncated or partially filled file therefore still renders the stock theme
	// rather than an empty hero.
	var settings = {
		// Leave blank normally: the header shows the company logo uploaded in Four51, then the
		// buyer's Company.Name as text. Set only to override that name, or for the login page,
		// which renders before any user (and so any company) is known.
		name: '',
		// Overrides the <link rel="icon"> pair in index.html. Blank keeps the
		// platform's storefrontfavicon.ico.
		favicon: '',
		logo: {
			url: '',
			alt: ''
		},
		hero: {
			// 2400x1360 landscape. mobileImage (1200x1800 portrait) replaces it below 768px;
			// blank reuses image there too.
			image: '',
			mobileImage: '',
			eyebrow: 'Fall 2026 Collection',
			heading: 'Gear your team for the season ahead.',
			// Set in italics after heading, like the design's "Made to be used, *every day.*"
			headingItalic: '',
			subheading: 'New apparel, drinkware and print kits, priced for your group.',
			// false hides the hero's call-to-action button while keeping its
			// buttonText/buttonHref in the file, ready to switch back on.
			showButton: true,
			buttonText: 'Shop the collection',
			// 'catalog' (the default) and '#shop' scroll to the shop section; anything else is
			// followed as a normal link.
			buttonHref: 'catalog',
			// Outlined second button. "" hides it. Pointed at #story, it only shows
			// when the site has a story section to scroll to.
			secondaryButtonText: 'Our story',
			secondaryButtonHref: '#story',
			// Colour behind the copy when there is no image (#rrggbb). Blank keeps the theme's
			// warm tan placeholder.
			background: '',
			// Copy colour. Blank picks it: white over an image, otherwise dark or light for
			// whichever reads better on the background. Buttons follow it.
			textColor: '',
			// Darkness of the shading over a photo, 0 (none) to 1 (black). Only used with image.
			overlay: 0.55,
			// "fixed": the banner is 680px tall (580 on phones) and the photo is cropped to fill it.
			// "image": the banner takes the photo's own proportions and shows all of it - for
			// artwork with text or logos built in, which cropping would cut off.
			height: 'fixed'
		},
		// Icon + text strip under the hero. Icons go by position: truck, returns arrow,
		// lock, clock. Empty hides the strip.
		trust: {
			items: []
		},
		announcement: {
			// Short lines shown in the bar above the header, separated by a dot. Empty
			// hides the bar entirely.
			messages: [],
			// Bar colours. Blank keeps the theme's ink bar. Set only background and the text
			// picks light or dark by itself, whichever reads better on it.
			background: '',
			textColor: ''
		},
		shop: {
			eyebrow: 'Shop',
			heading: 'The Collection',
			// InteropID of the Four51 category the one-page shop section lists. Set it
			// in each site's own site.json, not here -- it names that site's data. Blank
			// falls back to the site's Featured category (AppConst). The layout is built
			// for 1-12 products, so only the first 12 are shown.
			categoryInteropID: ''
		},
		// 50/50 image + copy section (the header's About link). Blank heading hides the section
		// and the link.
		story: {
			eyebrow: 'Our story',
			heading: '',
			headingItalic: '',
			// Each entry is one paragraph.
			paragraphs: [],
			image: '',
			// Link under the copy that scrolls to the shop. Blank hides it.
			linkText: 'Shop now',
			// "fixed": the photo is cropped to fill its half of the section. "image": the photo
			// keeps its own proportions and shows whole - for artwork with text built in.
			height: 'fixed'
		},
		// Accordion (the header's FAQ link). Each item is { "question": "...", "answer": "..." };
		// no items hides the section and the link.
		faq: {
			eyebrow: 'Help',
			heading: 'Questions, answered.',
			// "Still wondering? Email <email>" under the heading. Blank email hides the line.
			intro: 'Still wondering? Email',
			email: '',
			items: []
		},
		// Pop-up shown after sign-in. active turns it on and off; it only shows when it also has a
		// heading or text. frequency: "day" (once a day per customer), "login" (once per sign-in)
		// or "once" (once per message - editing the eyebrow, heading or text shows it again).
		// Editing the message also re-shows it under "day" and "login". Leave
		// secondaryButtonText blank for a single button. A button url of "#shop"/"#story"/
		// "#faq"/"#contact" scrolls there, a blank url just closes the pop-up, anything else is
		// followed as a link (full https:// links open in a new tab).
		welcome: {
			active: false,
			frequency: 'day',
			eyebrow: '',
			heading: '',
			text: '',
			image: '',
			primaryButtonText: '',
			primaryButtonUrl: '',
			secondaryButtonText: '',
			secondaryButtonUrl: ''
		},
		// Contact band above the footer (the header's Contact link): the Contact Us page's details
		// plus a short form. The form opens the customer's email app addressed to email, with
		// their name, email and message filled in - the theme has no server to send mail itself.
		// Blank email hides the form, keeping the details.
		contact: {
			eyebrow: 'Contact',
			heading: 'Any questions?',
			text: 'Questions or need help with an order? Need general site support?',
			hours: 'Monday – Friday, 8am to 5pm ET',
			hoursNote: 'Feel free to contact us outside of these hours and one of our team members will respond as soon as possible!',
			email: 'support@thumbprint.com',
			subject: 'Website message',
			// Band colour (#rrggbb). Blank follows the theme accent. Set only background and the
			// text, fields and Send button switch to dark-on-light by themselves when it's pale.
			background: '',
			textColor: ''
		},
		// Site footer, on every page (the header's Contact link). Blank blurb hides it; columns
		// and legalLinks replace the defaults whole when a site sets them.
		footer: {
			blurb: '',
			// Each column is { "heading": "...", "links": [{ "label": "...", "url": "..." }] }. A url
			// of "#shop", "#story", "#faq" or "#contact" scrolls to that section; "mailto:" and
			// "tel:" work too; anything else is a normal link.
			columns: [
				{ heading: 'Shop', links: [{ label: 'The collection', url: '#shop' }, { label: 'Order history', url: 'order' }, { label: 'Favorite products', url: 'favoriteproducts' }] },
				{ heading: 'Help', links: [{ label: 'FAQ', url: '#faq' }, { label: 'Contact us', url: 'contactus' }] }
			],
			// Links in the bottom row, next to the copyright line.
			legalLinks: []
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
			accentDark: '',
			// Overrides --mt-font-body, which drives the theme's page and component
			// roots. Name just the family -- FALLBACK_FONTS is appended behind it,
			// so a visitor without the font lands on the theme's own stack rather
			// than the browser's default serif.
			fontFamily: '',
			// Stylesheet that delivers fontFamily as a webfont, injected as a
			// <link>. Without it, fontFamily renders only for visitors who happen
			// to have the font installed locally.
			fontUrl: '',
			// Overrides --mt-font-display, the serif used for the logo text, hero and section
			// headings. Same rules as fontFamily; FALLBACK_DISPLAY_FONTS is appended behind it.
			// Its webfont still has to be delivered by fontUrl (one stylesheet can carry both).
			displayFontFamily: ''
		},
		shipping: {
			// The only shipping method names the checkout dropdowns may offer, matched
			// against the Name the API returns, trimmed and case-insensitively. Empty
			// means unrestricted, not "allow nothing" -- a site that has not filled
			// this in keeps everything the platform offers. The platform still decides
			// entitlement; this can only narrow what is shown, never add a method back.
			allowedDomesticMethods: [],
			// Methods offered only when the order ships outside domesticCountries.
			// When this is non-empty it replaces allowedDomesticMethods for an international
			// address, and its entries are suppressed on a domestic one -- the rule
			// is symmetric, so a carrier listed here never appears domestically.
			// Leave it empty and country plays no part at all.
			allowedInternationalMethods: [],
			// Country codes counted as domestic, as the address returns them. Defaults
			// to US alone; note that Canada and Mexico are not domestic here unless a
			// site says so.
			domesticCountries: ['US'],
			// Order subtotal that earns free shipping, as a plain number (75, not "$75"). Drives
			// the cart drawer's progress bar; 0 hides the bar. Display only -- the platform's
			// shipping rates decide what is actually charged.
			freeShippingThreshold: 0
		},
		// Applied to the hero element by ngStyle; recomputed whenever the file lands.
		heroStyle: {},
		// Derived from the hero's and contact band's colours, not site.json keys.
		heroIsDark: false,
		contactIsLight: false
	};

	// Anything here is written into a CSS custom property, so keep it to values
	// that are unambiguously colours -- no url(), no semicolons, nothing that
	// could carry extra declarations along with it.
	var COLOR = /^(#[0-9a-f]{3}|#[0-9a-f]{6}|rgba?\([\d\s.,%]+\)|hsla?\([\d\s.,%]+\)|[a-z]{3,20})$/i;

	// Same reasoning as COLOR, for a value that ends up in a font-family
	// declaration: family names, quotes and commas only. No parens (url()), no
	// semicolon or colon (a second declaration riding along).
	var FONT = /^[\w\s,'"-]+$/;

	// Whether a font stack already ends in a generic family. If it does not, the
	// theme's own stack is appended rather than leaving the browser to fall all
	// the way back to its default serif.
	var GENERIC = /(^|,)\s*(sans-serif|serif|monospace|cursive|fantasy|system-ui)\s*$/i;

	// What custom.css sets --mt-font-body / --mt-font-display to. Duplicated here on purpose: this is
	// the fallback appended behind a site's own font, and it should not silently
	// change if the stylesheet's default is retuned.
	var FALLBACK_FONTS = "'Instrument Sans', system-ui, sans-serif";
	var FALLBACK_DISPLAY_FONTS = "'Instrument Serif', Georgia, serif";

	// These land in a href/src attribute set through the DOM, never innerHTML, so
	// the only real hazard is a scheme that executes.
	var EXECUTABLE_SCHEME = /^\s*(javascript|vbscript):/i;

	function isColor(value) {
		return angular.isString(value) && COLOR.test(value.trim());
	}

	function stringList(value) {
		var output = [];
		angular.forEach(value, function(entry) {
			if (angular.isString(entry) && entry.trim() !== '') output.push(entry.trim());
		});
		return output;
	}

	// Lists of objects, by section.key: each entry is rebuilt from the fields it is allowed to
	// have, and dropped if the required ones are missing - one bad entry never fails the file.
	function link(entry) {
		if (!angular.isObject(entry) || !angular.isString(entry.label) || !entry.label.trim()) return null;
		if (!isSafeUrl(entry.url)) return null;
		return { label: entry.label.trim(), url: entry.url.trim() };
	}
	function objectList(value, shape) {
		var output = [];
		angular.forEach(value, function(entry) {
			var clean = shape(entry);
			if (clean) output.push(clean);
		});
		return output;
	}
	var OBJECT_LISTS = {
		'faq.items': function(entry) {
			if (!angular.isObject(entry) || !angular.isString(entry.question) || !entry.question.trim() || !angular.isString(entry.answer)) return null;
			return { question: entry.question.trim(), answer: entry.answer.trim() };
		},
		'footer.columns': function(entry) {
			if (!angular.isObject(entry) || !angular.isString(entry.heading)) return null;
			var links = objectList(entry.links, link);
			// No usable links means an unfilled template slot - a heading alone isn't a column.
			if (!links.length) return null;
			return { heading: entry.heading.trim(), links: links };
		},
		'footer.legalLinks': link
	};

	function isSafeUrl(value) {
		return angular.isString(value) && value.trim() !== '' && !EXECUTABLE_SCHEME.test(value);
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

		applyAccent(root);
		applyAnnouncementColors(root);
		applyHeroColors(root);
		applyContactColors(root);

		if (settings.story.height !== 'fixed' && settings.story.height !== 'image') {
			$log.warn('SiteConfig: story.height must be "fixed" or "image", using "fixed" -- ' + settings.story.height);
			settings.story.height = 'fixed';
		}
		applyFont(root);
	}

	// Relative luminance of a #rrggbb colour (WCAG), or null for anything else.
	function luminance(hex) {
		var m = /^#?([0-9a-f]{6})$/i.exec((hex || '').trim());
		if (!m) return null;
		var channels = [0, 2, 4].map(function(i) {
			var c = parseInt(m[1].substr(i, 2), 16) / 255;
			return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
		});
		return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
	}

	// Sets --msp-hero-bg / --msp-hero-text / --msp-hero-overlay, and settings.heroIsDark, which
	// the template uses to switch the buttons to their light-on-dark versions.
	function applyHeroColors(root) {
		var hero = settings.hero;
		var bg = (hero.background || '').trim();
		var fg = (hero.textColor || '').trim();

		if (bg && !isColor(bg)) {
			$log.warn('SiteConfig: hero.background is not a colour, ignoring -- ' + bg);
			bg = '';
		}
		if (fg && !isColor(fg)) {
			$log.warn('SiteConfig: hero.textColor is not a colour, ignoring -- ' + fg);
			fg = '';
		}
		if (bg) root.style.setProperty('--msp-hero-bg', bg);

		if (hero.height !== 'fixed' && hero.height !== 'image') {
			$log.warn('SiteConfig: hero.height must be "fixed" or "image", using "fixed" -- ' + hero.height);
			hero.height = 'fixed';
		}

		var overlay = Math.min(1, Math.max(0, hero.overlay));
		root.style.setProperty('--msp-hero-overlay', String(overlay));

		// Light copy means a dark hero. An explicit textColor decides; otherwise a photo (under
		// its shading) is dark, and a plain background is judged by its own luminance.
		var fgLum = luminance(fg);
		var bgLum = luminance(bg);
		if (fg && fgLum !== null) settings.heroIsDark = fgLum > 0.19;
		else if (hero.image) settings.heroIsDark = overlay >= 0.3;
		else if (bgLum !== null) settings.heroIsDark = bgLum <= 0.19;
		else settings.heroIsDark = false;

		if (!fg) fg = settings.heroIsDark ? '#FFFFFF' : '#1B1A17';
		root.style.setProperty('--msp-hero-text', fg);
	}

	// --msp-contact-bg / --msp-contact-text, and settings.contactIsLight for the template: a pale
	// band flips the copy, field outlines and Send button to their dark versions.
	function applyContactColors(root) {
		var bg = (settings.contact.background || '').trim();
		var fg = (settings.contact.textColor || '').trim();

		if (bg && !isColor(bg)) {
			$log.warn('SiteConfig: contact.background is not a colour, ignoring -- ' + bg);
			bg = '';
		}
		if (fg && !isColor(fg)) {
			$log.warn('SiteConfig: contact.textColor is not a colour, ignoring -- ' + fg);
			fg = '';
		}
		if (bg) root.style.setProperty('--msp-contact-bg', bg);

		var fgLum = luminance(fg);
		var bgLum = luminance(bg);
		if (fg && fgLum !== null) settings.contactIsLight = fgLum <= 0.19;
		else if (bgLum !== null) settings.contactIsLight = bgLum > 0.19;
		else settings.contactIsLight = false;

		if (!fg) fg = settings.contactIsLight ? '#1B1A17' : '#FFFFFF';
		root.style.setProperty('--msp-contact-text', fg);
	}

	function applyAnnouncementColors(root) {
		var bg = (settings.announcement.background || '').trim();
		var fg = (settings.announcement.textColor || '').trim();

		if (bg && !isColor(bg)) {
			$log.warn('SiteConfig: announcement.background is not a colour, ignoring -- ' + bg);
			bg = '';
		}
		if (fg && !isColor(fg)) {
			$log.warn('SiteConfig: announcement.textColor is not a colour, ignoring -- ' + fg);
			fg = '';
		}
		if (bg) {
			root.style.setProperty('--msp-announcement-bg', bg);
			// No text colour given: whichever of the theme's ink or ground has more contrast.
			// Only computable for #rrggbb; a named/rgb() background keeps the default light text.
			var lum = luminance(bg);
			// 0.19 is where the two give equal contrast ((L + 0.05)^2 = (0.011 + 0.05)(0.883 + 0.05)).
			if (!fg && lum !== null) fg = lum > 0.19 ? '#1B1A17' : '#F4F1EC';
		}
		if (fg) root.style.setProperty('--msp-announcement-text', fg);
	}

	function applyAccent(root) {
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

	// The stylesheet has to land before the family is worth setting, otherwise the
	// first paint uses the fallback and reflows once the webfont arrives. Injecting
	// it here rather than hard-coding a <link> in index.html keeps index.html
	// site-agnostic, which is the whole point of this file.
	function applyFont(root) {
		var family = (settings.theme.fontFamily || '').trim();
		var url = (settings.theme.fontUrl || '').trim();

		if (url) {
			if (isSafeUrl(url)) loadStylesheet(url);
			else $log.warn('SiteConfig: theme.fontUrl is not a usable URL, ignoring -- ' + url);
		}

		applyFamily(root, '--mt-font-body', 'fontFamily', FALLBACK_FONTS);
		applyFamily(root, '--mt-font-display', 'displayFontFamily', FALLBACK_DISPLAY_FONTS);
	}

	function applyFamily(root, property, key, fallback) {
		var family = (settings.theme[key] || '').trim();

		if (!family) return;
		if (!FONT.test(family)) {
			$log.warn('SiteConfig: theme.' + key + ' is not a font name, ignoring -- ' + family);
			return;
		}

		root.style.setProperty(property, GENERIC.test(family) ? family : family + ', ' + fallback);
	}

	function loadStylesheet(url) {
		var doc = $document[0];
		var existing = doc.querySelector('link[data-site-font]');

		if (existing) {
			existing.setAttribute('href', url);
			return;
		}

		var link = doc.createElement('link');
		link.setAttribute('rel', 'stylesheet');
		link.setAttribute('data-site-font', '');
		link.setAttribute('href', url);
		(doc.head || doc.getElementsByTagName('head')[0]).appendChild(link);
	}

	// index.html ships two icon links pointing at storefrontfavicon.ico, both
	// declaring image/x-icon. Repointing them at a PNG means dropping that type,
	// or a browser that trusts it renders nothing.
	function applyFavicon() {
		var url = (settings.favicon || '').trim();

		if (!url) return;
		if (!isSafeUrl(url)) {
			$log.warn('SiteConfig: favicon is not a usable URL, ignoring -- ' + url);
			return;
		}

		var doc = $document[0];
		var links = doc.querySelectorAll('link[rel="icon"], link[rel="shortcut icon"]');

		if (!links.length) {
			var link = doc.createElement('link');
			link.setAttribute('rel', 'icon');
			(doc.head || doc.getElementsByTagName('head')[0]).appendChild(link);
			links = [link];
		}

		angular.forEach(links, function(link) {
			link.setAttribute('href', url);
			link.removeAttribute('type');
		});
	}

	// One level deep, and blanks are ignored -- a site only names the keys it
	// actually overrides, and clearing a value back to "" restores the default.
	function apply(data) {
		if (data && angular.isString(data.name) && data.name !== '') settings.name = data.name;
		if (data && angular.isString(data.favicon) && data.favicon !== '') settings.favicon = data.favicon;

		// The tab title otherwise stays index.html's static "Storefront" for any page
		// rendered before a user is authenticated (the login screen, public routes) --
		// Four51Ctrl only sets it from Company.Name once a user has actually loaded.
		if (settings.name) $document[0].title = settings.name;

		angular.forEach(settings, function(defaults, section) {
			var overrides = data && data[section];
			if (!angular.isObject(defaults) || !angular.isObject(overrides)) return;

			angular.forEach(defaults, function(value, key) {
				var override = overrides[key];

				// The override has to match the shape of the default it replaces. A key
				// that defaults to a list takes only a list; one that defaults to a
				// string takes only a string. Anything else is ignored, so the key keeps
				// its default and the rest of the file still applies -- the same
				// treatment a blank gets.
				//
				// Without the type check a list written as a bare string ("UPS Ground"
				// instead of ["UPS Ground"]) was stored as a string and then iterated
				// character by character downstream, which threw inside checkout.
				if (angular.isArray(value)) {
					var shape = OBJECT_LISTS[section + '.' + key];
					if (angular.isArray(override)) defaults[key] = shape ? objectList(override, shape) : stringList(override);
					else if (override !== undefined) $log.warn('SiteConfig: ' + section + '.' + key + ' must be a list, ignoring -- ' + angular.toJson(override));
				}
				// A number takes only a real, non-negative number -- a quoted "75" is ignored the
				// same way a quoted "false" is below.
				else if (typeof value === 'number') {
					if (typeof override === 'number' && isFinite(override) && override >= 0) defaults[key] = override;
					else if (override !== undefined) $log.warn('SiteConfig: ' + section + '.' + key + ' must be a number, ignoring -- ' + angular.toJson(override));
				}
				// A switch takes only a real true/false. A quoted "false" is a non-empty
				// string, which would read as on -- the opposite of what was written.
				else if (typeof value === 'boolean') {
					if (typeof override === 'boolean') defaults[key] = override;
					else if (override !== undefined) $log.warn('SiteConfig: ' + section + '.' + key + ' must be true or false, ignoring -- ' + angular.toJson(override));
				}
				// Lists are taken whole rather than merged, so a site can shorten one as
				// well as extend it. Non-string entries are dropped instead of failing
				// the whole file.
				// Text: whatever the site wrote, "" included - an empty value hides that text (the
				// hero heading, a button). Leaving the key out keeps the default. null also clears,
				// for files written when "" still meant "keep the default".
				else if (angular.isString(value) && angular.isString(override)) defaults[key] = override;
				else if (angular.isString(value) && override === null) defaults[key] = '';
			});
		});

		settings.heroStyle = settings.hero.image
			? { 'background-image': "url('" + settings.hero.image + "')" }
			: {};

		applyTheme();
		applyFavicon();
	}

	// Templates bind to this same object, so they pick the values up when the
	// request resolves. The URL is relative to <base href>, i.e. the deployed app
	// folder -- the same way partials are loaded.
	var loaded = $http.get('site.json', { cache: true }).then(function(response) {
		// $http only parses a body that looks like JSON (starts with { or [), so a file pasted
		// without its outer braces arrives as a plain string and every key silently falls back
		// to its default. Say so, rather than leaving the site looking half-configured.
		if (!angular.isObject(response.data) || angular.isArray(response.data)) {
			$log.warn('SiteConfig: site.json is not a valid JSON object (check the outer { } braces and commas) -- using theme defaults');
			return settings;
		}
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