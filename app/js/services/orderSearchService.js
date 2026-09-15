four51.app.factory('OrderSearch', ['$resource', '$451', '$q', function($resource, $451, $q) {
	var cache = [], statCache;
	function _then(fn, data, count) {
		if (angular.isFunction(fn))
			fn(data, count);
	}

    var _search = function(stat, success, page, pagesize) {
	    page = page || 1;
	    pagesize = pagesize || 100;
	    (stat.DateRangeFrom && typeof stat.DateRangeFrom != 'string') ? stat.DateRangeFrom = stat.DateRangeFrom.toISOString() : null;
	    (stat.DateRangeTo && typeof stat.DateRangeTo != 'string') ? stat.DateRangeTo = stat.DateRangeTo.toISOString() : null;

	    stat.page = page || 1;
	    stat.pagesize = pagesize || 10;

	    if (stat || stat != statCache) {
		    statCache = stat;
		    cache.splice(0, cache.length);
	    }
	    if (typeof cache[(page-1) * pagesize] == 'object' && typeof cache[(page * pagesize) - 1] == 'object') {
		    _then(success, cache, cache.length);
	    }
	    else {
		    $resource($451.api('order')).get(stat).$promise.then(function (list) {
			    for (var i = 0; i <= list.Count - 1; i++) {
				    if (typeof cache[i] == 'object') continue;
				    cache[i] = list.List[i - (page - 1) * pagesize] || i;
			    }
			    _then(success, cache, list.Count);
		    });
	    }
    }

	// Fetches every real criteria bucket (one call per actual Type/Status entry returned by
	// OrderSearchCriteria.query()) and merges them into one list. Deliberately bypasses the
	// single shared `cache`/`statCache` above (and _search entirely) - that cache assumes one
	// active search at a time, so firing it once per bucket here would have each call stomp the
	// last one's results. There's no real "give me every status" filter on the server (the
	// per-bucket criteria objects are the only field combinations confirmed to filter
	// correctly), so this fetches each bucket with its own real criteria and combines them
	// client-side instead of guessing at a single unfiltered request.
	var _searchAll = function(criteriaList, success, pagesize) {
		pagesize = pagesize || 100;
		var calls = [];
		angular.forEach(criteriaList, function(c) {
			var stat = angular.copy(c);
			stat.page = 1;
			stat.pagesize = pagesize;
			calls.push($resource($451.api('order')).get(stat).$promise);
		});
		$q.all(calls).then(function(results) {
			var merged = [];
			angular.forEach(results, function(r) {
				merged = merged.concat((r && r.List) || []);
			});
			merged.sort(function(a, b) {
				return new Date(b.DateSubmitted || b.DateCreated) - new Date(a.DateSubmitted || a.DateCreated);
			});
			_then(success, merged, merged.length);
		});
	}

	return {
		search: _search,
		searchAll: _searchAll
	};
}]);