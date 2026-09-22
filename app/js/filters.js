four51.app.filter('onproperty', ['$451', function($451) {
	var defaults = {
		'OrderStats': 'Type',
		'Message': 'Box'
	};

	return function(input, query) {
		if (!input || input.length === 0) return;
		if (!query) return input;
		query.Property = query.Property || defaults[query.Model];
		return $451.filter(input, query);
	}
}]);

four51.app.filter('kb', function() {
	return function(value) {
		return isNaN(value) ? value : parseFloat(value) / 1024;
	}
});

four51.app.filter('r', ['$sce', 'WhiteLabel', function($sce, WhiteLabel) {
	return function(value) {
		var result = value, found = false;
		angular.forEach(WhiteLabel.replacements, function(c) {
			if (found) return;
			if (c.key == value) {
				result = $sce.trustAsHtml(c.value);
				found = true;
			}
		});
		return result;
	}
}]);

four51.app.filter('rc', ['$sce', 'WhiteLabel', function($sce, WhiteLabel) {
	return function(value) {
		var result = value, found = false;
		angular.forEach(WhiteLabel.replacements, function(c) {
			if (found) return;
			if (c.key.toLowerCase() == value.toLowerCase()) {
				result = $sce.trustAsHtml(c.value);
				found = true;
			}
		});
		return result;
	}
}]);

four51.app.filter('rl', ['$sce', 'WhiteLabel', function($sce, WhiteLabel) {
	return function(value) {
		var result = value, found = false;
		angular.forEach(WhiteLabel.replacements, function(c) {
			if (found) return;
			if (c.key.toLowerCase() == value.toLowerCase()) {
				result = $sce.trustAsHtml(c.value.toLowerCase());
				found = true;
			}
		});
		return result;
	}
}]);

four51.app.filter('noliverates', function() {
	return function(value) {
		var output = [];
		angular.forEach(value, function(v) {
			if (v.ShipperRateType != 'ActualRates')
				output.push(v);
		});
		return output;
	}
});

// Narrows the shipper list the API returned to what site.json allows for this
// order's destination. Sits beside noliverates, which does the same job from rate
// type rather than config.
//
// Two settings, and country decides which applies:
//   allowedDomesticMethods       - what a domestic address may use
//   allowedInternationalMethods  - what an address outside domesticCountries may use
//
// The rule is symmetric, matching how the live stores do it (see the shipperFilter
// in CapitalVacationsUniforms/Everstory): an international address sees only the
// international list, and a domestic one never sees those carriers. Leave
// allowedInternationalMethods empty and country plays no part --
// allowedDomesticMethods applies everywhere.
//
// An empty list means "not configured", not "allow nothing" -- the same contract as
// every other blank in site.json, and the only safe reading: a site that has not
// filled this in must keep whatever the platform offers rather than lose checkout.
// The original array comes back untouched in that case, so the common path does not
// hand ng-options a fresh identity every digest.
//
// An unknown country counts as domestic. The directive resolves the address before
// calling this, so that is a genuine "no address chosen yet" rather than a race.
four51.app.filter('visibleshippers', ['SiteConfig', '$log', function(SiteConfig, $log) {
	function nameSet(list) {
		var set = {};
		angular.forEach(list, function(name) {
			if (angular.isString(name)) set[name.trim().toLowerCase()] = true;
		});
		return set;
	}

	// A shipper with no Name cannot match a list keyed on names, and the dropdowns
	// render Name, so it is no use here either way.
	function keep(list, predicate) {
		var output = [];
		angular.forEach(list, function(shipper) {
			var name = shipper && angular.isString(shipper.Name) ? shipper.Name.trim().toLowerCase() : null;
			if (name && predicate(name)) output.push(shipper);
		});
		return output;
	}

	return function(value, country) {
		var shipping = SiteConfig.settings.shipping || {};
		var domesticMethods = angular.isArray(shipping.allowedDomesticMethods) ? shipping.allowedDomesticMethods : [];
		var internationalMethods = angular.isArray(shipping.allowedInternationalMethods) ? shipping.allowedInternationalMethods : [];
		// An empty list here would make every address international, which is never
		// what an empty value means anywhere else in this file.
		var countries = angular.isArray(shipping.domesticCountries) && shipping.domesticCountries.length
			? shipping.domesticCountries : ['US'];

		if (!angular.isArray(value) || (!domesticMethods.length && !internationalMethods.length)) return value;

		var code = angular.isString(country) ? country.trim().toUpperCase() : '';
		var domesticSet = nameSet(countries);
		var isInternational = code !== '' && !domesticSet[code.toLowerCase()];

		var output = value;

		if (internationalMethods.length) {
			var internationalSet = nameSet(internationalMethods);
			output = keep(output, function(name) {
				return isInternational ? !!internationalSet[name] : !internationalSet[name];
			});
		}

		// allowedDomesticMethods is the domestic list, so it does not narrow an international
		// address that already has a list of its own.
		if (domesticMethods.length && !(isInternational && internationalMethods.length)) {
			var domesticSetOfMethods = nameSet(domesticMethods);
			output = keep(output, function(name) { return !!domesticSetOfMethods[name]; });
		}

		if (!output.length && value.length) {
			var applied = isInternational && internationalMethods.length ? 'allowedInternationalMethods' : 'allowedDomesticMethods';
			$log.warn('SiteConfig: ' + applied + ' matched none of the methods this order offers [' +
				keep(value, function() { return true; }).map(function(s) { return s.Name; }).join(', ') +
				'] for country "' + (code || 'unknown') + '" -- the shipping dropdown will be empty. ' +
				'Check the names against the Four51 admin.');
		}

		return output;
	};
}]);

four51.app.filter('paginate', function() {
	return function(input, start) {
		if (typeof input != 'object' || !input) return;
		start = +start; //parse to int
		return input.slice(start);
	}
});

// An Order's embedded LineItem.Product.LargeImageUrl comes back as .../images/Product/<guid>.jpg
// (capital P) while the live catalog's Product.LargeImageUrl for the exact same product/image is
// .../images/product/<guid>.jpg (lowercase) - only the lowercase path actually resolves on
// four51.com's image host. Confirmed by loading both URLs directly against a real order: the
// capitalized path errors, the lowercase path loads fine for the same GUID. Only affects
// LargeImageUrl; SmallImageUrl's file genuinely lives under a different path (productThumbnail)
// that an order snapshot doesn't reference at all, so there's no equivalent fix for that field -
// use LargeImageUrl for any order-context image.
four51.app.filter('orderImageUrl', function() {
	return function(url) {
		if (!url) return url;
		return url.replace(/\/images\/product\//i, '/images/product/');
	}
});
