four51.app.controller('OrderViewCtrl', ['$scope', '$location', '$routeParams', 'Order', 'FavoriteOrder', 'Address', 'User', 'Variant',
	function ($scope, $location, $routeParams, Order, FavoriteOrder, Address, User, Variant) {
		$scope.loadingIndicator = true;

		$scope.isInPath = function(path) {
			var cur_path = $location.path().replace('/', '');
			var result = false;

			if(cur_path.indexOf(path) > -1) {
				result = true;
			}
			else {
				result = false;
			}
			return result;
		};

		Order.get($routeParams.id, function(data){
			$scope.loadingIndicator = false;
			$scope.order = data;
			$scope.order.recent = $scope.isInPath("new");
			$scope.hasSpecsOnAnyLineItem = false;
			for(var i = 0; i < data.LineItems.length ; i++) {
				if (data.LineItems[i].Specs) {
					$scope.hasSpecsOnAnyLineItem = true;
					break;
				}
			}

			if ($scope.order.IsMultipleShip()) {
				angular.forEach(data.LineItems, function(item) {
					if (item.ShipAddressID) {
						Address.get(item.ShipAddressID, function(add) {
							item.ShipAddress = add;
						});
					}
				});
			}
			else {
				Address.get(data.ShipAddressID || data.LineItems[0].ShipAddressID, function(add) {
					data.ShipAddress = add;
				});
			}

			Address.get(data.BillAddressID, function(add){
				data.BillAddress = add;
			});
			if(data.HasShipments){
				Order.listShipments(data, function(data){
					$scope.shipments = data;
				})
			}
		}, true);

		$scope.saveFavorite = function(callback) {
			$scope.displayLoadingIndicator = true;
			$scope.errorMessage = null;
			$scope.actionMessage = null;
			FavoriteOrder.save($scope.order,
				function() {
					$scope.displayLoadingIndicator = false;
					if (callback) callback($scope.order);
					$scope.actionMessage = "Your order has been saved as a Favorite";
				},
				function(ex) {
					$scope.errorMessage = ex.Message;
				}
			);
		};

		$scope.repeatOrder = function() {
			$scope.errorMessage = null;
			$scope.actionMessage = null;
			$scope.displayLoadingIndicator = true;
			Order.repeat($scope.order.ID,
				function(data) {
					$scope.currentOrder = data;
					$scope.user.CurrentOrderID = data.ID;
					User.save($scope.user,
						function(data){
							$scope.user = data;
							$location.path('/cart');
						},
						function(ex) {
							// Order.repeat already created/updated the order server-side by this
							// point - only setting it as the shopper's current order failed, so
							// surface that instead of leaving the click looking like it did nothing.
							$scope.displayLoadingIndicator = false;
							$scope.errorMessage = ex.Message;
						}
					);
				},
				function(ex) {
					$scope.displayLoadingIndicator = false;
					$scope.errorMessage = ex.Message;
				}
			);
		};

		$scope.setCurrent = function() {
			$scope.errorMessage = null;
			$scope.actionMessage = null;
			User.setcurrentorder($scope.order.ID,
				function(data) {
					$scope.user = data;
					Order.get(data.CurrentOrderID, function(order) {
						$scope.currentOrder = order;
						$location.path('/cart');
					});
				},
				function(ex) {
					$scope.errorMessage = ex.Message;
				}
			)
		};

		$scope.onPrint = function()  {
			window.print();
		};

        $scope.downloadProof = function(item) {
            $scope.errorMessage = null;
            Variant.get({VariantInteropID: item.Variant.InteropID, ProductInteropID: item.Product.InteropID }, function(v) {
                if (v.ProofUrl) {
                    window.location = v.ProofUrl;
                }
                else {
                    $scope.errorMessage = "Unable to download proof"
                }
            });
        };
	}]);