four51.app.controller('NavCtrl', ['$location', '$route', '$scope', '$rootScope', '$document', '$451', '$timeout', '$window', 'User', 'Order', 'SpendingAccount', 'AppConst',
function ($location, $route, $scope, $rootScope, $document, $451, $timeout, $window, User, Order, SpendingAccount, AppConst) {
    // Four51 InteropIDs are unique platform-wide, so Featured/All Products may carry a uniqueness
    // suffix (e.g. "featured-gp") - match by prefix, not exact equality. Mirrors the same
    // exclusion categoryCtrl.js already applies to the home page's "Shop by category" tiles.
    function startsWithInteropID(fullID, prefix) {
        return !!fullID && !!prefix && fullID.toLowerCase().indexOf(prefix.toLowerCase()) === 0;
    }

    // Featured and All Products are utility categories, not real departments - never show them
    // as top-level items in the main nav.
    $scope.isNavCategory = function(cat) {
        return !startsWithInteropID(cat.InteropID, AppConst.featuredCategoryInteropID) && !startsWithInteropID(cat.InteropID, AppConst.allProductsCategoryInteropID);
    };

    // Groups (Company > Groups in the admin) are a real array on the user object, each
    // {Name, ID, InteropID, ...} - checked by Name since InteropID is often left blank.
    $scope.isInGroup = function(groupName) {
        return !!($scope.user && $scope.user.Groups && $scope.user.Groups.some(function(g){ return g.Name === groupName; }));
    };

    $scope.$watch('user', function(user) {
        if (user && user.Type == 'Customer' && user.Permissions.contains('PayByBudgetAccount')) {
            SpendingAccount.query(function(accounts) {
                $scope.purchaseSpendingAccounts = (accounts || []).filter(function(a) { return a.ForPurchase; });
            });
        }
    });

    // Header UI state. Objects, not bare primitives: the account links are ng-included, and a
    // bare name written from inside ng-include/ng-if lands on that child scope instead (the
    // sortSelection lesson in THEME-DEVELOPMENT-NOTES.md).
    $scope.ui = { searchOpen: false, menuAccountOpen: false };
    // Which drawer is open: 'menu', 'cart', or null. The drawers share one backdrop, so only
    // one is ever open at a time.
    $scope.drawer = { open: null };

    var drawerTrigger = null;
    $scope.openDrawer = function(name, $event) {
        drawerTrigger = $event && $event.currentTarget;
        $scope.ui.searchOpen = false;
        $scope.drawer.open = name;
    };
    $scope.closeDrawer = function() {
        if (!$scope.drawer.open) return;
        $scope.drawer.open = null;
        $scope.ui.menuAccountOpen = false;
        // Hand focus back to whatever opened the drawer, per the design's accessibility notes.
        if (drawerTrigger && document.body.contains(drawerTrigger)) {
            var trigger = drawerTrigger;
            $timeout(function() { trigger.focus(); });
        }
        drawerTrigger = null;
    };
    // The page behind an open drawer should not scroll.
    $scope.$watch('drawer.open', function(open) {
        angular.element(document.body).toggleClass('msp-drawer-lock', !!open);
    });
    function onKeydown(e) {
        if (e.keyCode !== 27) return;
        if ($scope.drawer.open) $scope.$apply($scope.closeDrawer);
        else if ($scope.ui.searchOpen) $scope.$apply(function() { $scope.ui.searchOpen = false; });
    }
    $document.on('keydown', onKeydown);
    $scope.$on('$destroy', function() {
        $document.off('keydown', onKeydown);
        angular.element(document.body).removeClass('msp-drawer-lock');
    });
    // Any route change closes whatever is open.
    $scope.$on('$routeChangeStart', function() {
        $scope.drawer.open = null;
        $scope.ui.searchOpen = false;
    });

    $scope.toggleSearch = function(forceOpen) {
        $scope.ui.searchOpen = forceOpen || !$scope.ui.searchOpen;
        if ($scope.ui.searchOpen)
            $timeout(function() {
                var input = document.getElementById('mt-store-search');
                if (input) input.focus();
            });
    };

    // The one-page layout's sections, in page order. About and FAQ only link when the site has
    // that section to show; Shop and Contact (the footer) are always on the page.
    // Built in a watch, not a function the template calls: ng-repeat over a fresh array on every
    // digest never settles, and Angular 1.2 re-renders the list each pass until it gives up.
    function hasStory() { var site = $scope.site || {}; return !!(site.story && site.story.heading); }
    function hasFaq() { var site = $scope.site || {}; return !!(site.faq && site.faq.items && site.faq.items.length); }
    $scope.$watch(function() { return [hasStory(), hasFaq()].join(); }, function() {
        var links = [{ id: 'shop', label: 'Shop' }];
        if (hasStory()) links.push({ id: 'story', label: 'About' });
        if (hasFaq()) links.push({ id: 'faq', label: 'FAQ' });
        links.push({ id: 'contact', label: 'Contact' });
        $scope.sectionLinks = links;
    });

    // Section links are real hrefs to catalog (so they work opened in a new tab), but a plain
    // click scrolls in-page. From any other route, go home first and scroll once the view has
    // rendered. preventDefault keeps the native navigation from racing the handler - the
    // href="#" logout bug in THEME-DEVELOPMENT-NOTES.md.
    function scrollToSection(id) {
        if (id === 'top') return $window.scrollTo({ top: 0, behavior: 'smooth' });
        var el = document.getElementById(id);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    $scope.goToSection = function(id, $event) {
        if ($event && ($event.metaKey || $event.ctrlKey || $event.shiftKey || $event.button === 1)) return;
        if ($event) $event.preventDefault();
        $scope.closeDrawer();

        if ($location.path() === '/catalog') return scrollToSection(id);

        var off = $rootScope.$on('$viewContentLoaded', function() {
            off();
            // Let the home page's own content (tree, products) render before measuring.
            $timeout(function() { scrollToSection(id); }, 400);
        });
        $location.path('/catalog');
    };

    $scope.doSearch = function(){
        if ($scope.searchTerm)
            $location.path('search/' + $scope.searchTerm);
    };

    // Removing straight from the mini-cart, without leaving whatever page the shopper is
    // browsing. Mirrors cartCtrl.js's removeItem(), minus the shipping-recalc/saveChanges
    // afterward - the shopper isn't on the checkout flow here, so there's nothing to resave.
    //
    // Does NOT assign $scope.currentOrder itself, on purpose: <navigation> (this controller)
    // gets its own scope as a SIBLING of ng-view, not an ancestor of it, so an assignment here
    // only ever shadowed nav's own copy - every other page keeps reading Four51Ctrl's real
    // currentOrder, which never changed, so a category-page add-to-cart right after a mini-cart
    // removal sent the server a stale order and came back with a raw "Object reference not set
    // to an instance of an object" exception. Order.deletelineitem already broadcasts
    // event:orderUpdate on every call; Four51Ctrl.js listens for it and updates the one
    // currentOrder every page actually inherits from - this just needs to trigger that.
    $scope.removeMinicartItem = function(item){
        if (!$scope.currentOrder || !confirm('Are you sure you wish to remove this item from your cart?'))
            return;
        Order.deletelineitem($scope.currentOrder.ID, item.ID, function(order){
            if (!order) {
                $scope.user.CurrentOrderID = null;
                User.save($scope.user);
            }
        }, function(ex){
            alert(ex.Message);
        });
    };

    // Confirmation for staying on the page after Add to Cart (see productCtrl.js's
    // addToOrder()) - pop the mini-cart open briefly instead of jumping to /cart. The dropdown
    // (ui-bootstrap 0.10's dropdownToggle directive) has no is-open binding - it's a pure
    // click-driven closure with no scope API at all - so opening/closing it programmatically
    // means dispatching the same click events a shopper's own click would produce, rather than
    // via a binding it doesn't support.
    var minicartCloseTimer;
    $scope.$on('event:addedToCart', function(){
        var toggle = document.getElementById('451qa_cart_link');
        if (!toggle) return;
        if (!angular.element(toggle.parentElement).hasClass('open'))
            toggle.click();
        $timeout.cancel(minicartCloseTimer);
        minicartCloseTimer = $timeout(function(){
            if (angular.element(toggle.parentElement).hasClass('open'))
                document.dispatchEvent(new MouseEvent('click', {bubbles: true}));
        }, 4000);
    });

    $scope.Logout = function(){
        // Dropping the token on its own just re-renders the login form under
        // whatever URL the user was on -- /catalog, a product page -- which is
        // what made logging out look broken. The old redirect ran on anon sites
        // only, and even there reloaded the page being left, since $location
        // does not write the new URL until the digest. Navigate instead: every
        // site lands on /login with all state re-initialised, and an anon site
        // picks up a fresh temp session on the way back in.
        function goToLogin() {
            $window.location.href = '/' + $451.apiName + '/login';
        }

        User.logout($scope.user, goToLogin, function(ex){
            console.log(ex.Message);
            goToLogin();
        });
    };

    // http://stackoverflow.com/questions/12592472/how-to-highlight-a-current-menu-item-in-angularjs
    $scope.isActive = function(path) {
        var cur_path = $location.path().replace('/', '');
        var result = false;

        if (path instanceof Array) {
            angular.forEach(path, function(p) {
                if (p == cur_path && !result)
                    result = true;
            });
        }
        else {
            if (cur_path == path)
                result = true;
        }
        return result;
    };
    // extension of above isActive in path
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

    // Marks a top-nav category as active while the shopper is browsing it or one of its
    // subcategories (e.g. Apparel stays highlighted while on Apparel > Mens), independent of
    // the dropdown itself, which only ever opens on hover/focus - it doesn't stay expanded
    // after navigating to a subcategory.
    $scope.isCategoryActive = function(cat) {
        if ($scope.isInPath(cat.InteropID)) return true;
        var active = false;
        angular.forEach(cat.SubCategories, function(sub) {
            if ($scope.isInPath(sub.InteropID)) active = true;
        });
        return active;
    };

    $scope.Clear = function() {
        localStorage.clear();
    }

    // Derived straight from the inherited currentOrder (Four51Ctrl.js owns and syncs it) rather
    // than from event:orderUpdate payloads. Counting whatever order the last broadcast carried
    // left the badge blank after a full page load whenever that init broadcast fired before this
    // controller existed, and wrong whenever an unrelated order was broadcast (Order.get of a
    // history order, a kit's own save) - while the mini-cart, bound to currentOrder, was right.
    $scope.$watch(function() {
        var order = $scope.currentOrder;
        if (!order || order.Status != 'Unsubmitted') return null;
        // A kit that's still mid-configuration is a real LineItem server-side (the platform
        // requires that to know what needs configuring), but it isn't done yet - don't count it
        // as "added" until KitIsInvalid clears.
        var count = 0;
        angular.forEach(order.LineItems, function(li) {
            if (!(li.IsKitParent && li.KitIsInvalid)) count++;
        });
        return count;
    }, function(count) {
        $scope.cartCount = count;
    });
}]);