// The shop's one-product layout (the handoff's "1 product" mode): when the site.json shop category
// holds exactly one product, the home page shows it as a product detail instead of a one-card grid.
// Add-to-cart is the quick-add modal's flow (quickAddModalCtrl.js) laid out inline, so the same
// products work here that work there. Kits, VariableText, the bulk variant list and required
// non-variant specs still need the full product page, so those show a link to it instead - the
// same fallback the modal uses.
four51.app.controller('SingleProductCtrl', ['$scope', '$rootScope', 'Product', 'ProductDisplayService', 'Order', 'User',
function ($scope, $rootScope, Product, ProductDisplayService, Order, User) {
	$scope.settings = { currentPage: 1, pageSize: 10 };
	$scope.singleLoading = true;

	// categoryCtrl.js's search result is the lighter list shape; the spec form and variant
	// lookup need the full product, same as the quick-add path fetches before deciding.
	Product.get($scope.shopProducts[0].InteropID, function(product) {
		$scope.LineItem = { Product: product };

		User.get(function(user) {
			// Merge, never assign $scope.user - see the same note in quickAddModalCtrl.js.
			if ($scope.user) angular.extend($scope.user, user);
			else $scope.user = user;

			ProductDisplayService.setNewLineItemScope($scope);
			ProductDisplayService.setProductViewScope($scope);

			$scope.needsFullPdp = product.Type == 'Kit' || product.Type == 'VariableText' || $scope.allowAddFromVariantList;
			if (!$scope.needsFullPdp) {
				angular.forEach($scope.LineItem.Specs, function(s) {
					if (s.Required && !s.DefinesVariant) $scope.needsFullPdp = true;
				});
			}

			// Restricted quantities: no default unless there is only one to choose (the
			// restricted-quantity rule in THEME-DEVELOPMENT-NOTES.md).
			var ps = $scope.LineItem.PriceSchedule;
			if (ps && ps.RestrictedQuantity) {
				if (ps.PriceBreaks && ps.PriceBreaks.length == 1) $scope.LineItem.Quantity = ps.PriceBreaks[0].Quantity;
			}
			else {
				$scope.LineItem.Quantity = (ps && ps.DefaultQuantity) || 1;
			}

			$scope.singleLoading = false;
		});
	});

	$scope.productPageUrl = function() {
		var p = $scope.LineItem && $scope.LineItem.Product;
		return p ? (p.Type == 'Kit' ? 'kit/' : 'product/') + p.InteropID : '';
	};

	// Uses a local order rather than $scope.currentOrder, so this scope never shadows the shared
	// one (THEME-DEVELOPMENT-NOTES.md). Order.save's event:orderUpdate updates the real cart.
	$scope.addSingleToCart = function() {
		$scope.addAttempted = true;
		$scope.errorMessage = null;
		if ($scope.lineItemErrors && $scope.lineItemErrors.length) return;

		$scope.addToOrderIndicator = true;
		var order = $scope.currentOrder || { LineItems: [] };
		if (!order.LineItems) order.LineItems = [];
		var pending = ProductDisplayService.addOrMergeLineItem(order, $scope.LineItem);
		order.Type = $scope.LineItem.PriceSchedule.OrderType;
		Order.clearshipping(order).save(order,
			function(o) {
				$scope.user.CurrentOrderID = o.ID;
				User.save($scope.user, function(u) {
					angular.extend($scope.user, u);
				});
				$scope.addToOrderIndicator = false;
				$scope.addAttempted = false;
				$rootScope.$broadcast('event:addedToCart');
			},
			function(ex) {
				pending.undo();
				$scope.addToOrderIndicator = false;
				$scope.errorMessage = (ex && (ex.Detail || ex.Message)) || 'Unable to add to cart.';
			}
		);
	};
}]);
