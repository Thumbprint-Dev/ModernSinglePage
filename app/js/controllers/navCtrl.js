four51.app.controller('NavCtrl', ['$location', '$route', '$scope', '$rootScope', '$document', '$451', '$timeout', '$window', 'User', 'Order', 'SpendingAccount', 'AppConst', 'OrderConfig', 'SectionNav', 'SiteConfig', 'Security',
function ($location, $route, $scope, $rootScope, $document, $451, $timeout, $window, User, Order, SpendingAccount, AppConst, OrderConfig, SectionNav, SiteConfig, Security) {
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
        // Opened by an add-to-cart rather than a click: focus returns to the cart button.
        drawerTrigger = ($event && $event.currentTarget) || (name == 'cart' && document.getElementById('451qa_cart_link'));
        $scope.ui.searchOpen = false;
        $scope.drawer.open = name;
    };
    $scope.closeDrawer = function() {
        if (!$scope.drawer.open) return;
        $scope.drawer.open = null;
        // Release the scroll lock now, not on the next digest's watch: a section link closes the
        // drawer and scrolls in the same tick, and a still-locked body swallows that scroll.
        angular.element(document.body).removeClass('msp-drawer-lock');
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

    // Scrolling itself lives in SectionNav (Four51Ctrl exposes it as goToSection to every view);
    // from the header and menu it also has to close the drawer.
    $scope.goToSection = function(id, $event) {
        $scope.closeDrawer();
        SectionNav.goTo(id, $event);
    };

    $scope.doSearch = function(){
        if ($scope.searchTerm)
            $location.path('search/' + $scope.searchTerm);
    };

    // ===== Sign-in pop-up (site.json welcome) =====
    // Once per sign-in session, not per page load: remembered against a hash of the session's
    // auth token, so a new sign-in - through the login form or an AutoLogon link alike - shows it
    // again, and reloads within the same session don't. Shares the drawers' backdrop, Esc and
    // focus handling (drawer.open == 'welcome').
    var WELCOME_KEY = 'msp-welcome-seen.' + $451.apiName;
    function sessionMark() {
        var token = Security.auth() || '';
        var hash = 5381;
        for (var i = 0; i < token.length; i++) hash = ((hash << 5) + hash + token.charCodeAt(i)) | 0;
        if (token) return String(hash);
        // No readable token (e.g. an HttpOnly cookie on some tenant): fall back to once per tab.
        try {
            var tab = sessionStorage.getItem(WELCOME_KEY + '.tab');
            if (!tab) sessionStorage.setItem(WELCOME_KEY + '.tab', tab = String(Date.now()));
            return 'tab-' + tab;
        } catch (e) { return 'tab'; }
    }
    function welcomeSeen(mark) {
        try { return localStorage.getItem(WELCOME_KEY) === mark; } catch (e) { return false; }
    }
    function rememberWelcome(mark) {
        try { localStorage.setItem(WELCOME_KEY, mark); } catch (e) { /* private mode: shows once per page load instead */ }
    }
    $scope.welcomeHasContent = function() {
        var w = $scope.site && $scope.site.welcome;
        return !!(w && w.active && (w.heading || w.text));
    };
    var welcomeChecked = false;
    function maybeShowWelcome() {
        if (welcomeChecked || !$scope.user || $scope.user.Type == 'TempCustomer') return;
        welcomeChecked = true;
        if (!$scope.welcomeHasContent()) return;
        var mark = sessionMark();
        if (!mark || welcomeSeen(mark)) return;
        rememberWelcome(mark);
        // After the page's first paint, so the pop-up isn't the first thing to flash in.
        $timeout(function() { if (!$scope.drawer.open) $scope.openDrawer('welcome'); }, 600);
    }
    SiteConfig.loaded.then(function() {
        $scope.$watch('user', function(user) { if (user) maybeShowWelcome(); });
    });

    // Buttons: "#section" scrolls, blank just closes, anything else navigates.
    $scope.welcomeHref = function(url) {
        if (!url || url.charAt(0) == '#') return 'catalog';
        return url;
    };
    $scope.welcomeExternal = function(url) {
        return !!url && /^https?:/i.test(url);
    };
    $scope.welcomeAction = function(url, $event) {
        if (!url) {
            if ($event) $event.preventDefault();
            return $scope.closeDrawer();
        }
        if (url.charAt(0) == '#') return $scope.goToSection(url.substr(1), $event);
        $scope.closeDrawer();
    };

    // ===== Cart drawer =====
    // Everything here reads and mutates the inherited currentOrder but never assigns
    // $scope.currentOrder: this controller's scope is a SIBLING of ng-view, so an assignment would
    // only shadow nav's own copy and every page would keep the stale order (the mini-cart bug in
    // THEME-DEVELOPMENT-NOTES.md). Order.save / Order.deletelineitem broadcast event:orderUpdate,
    // and Four51Ctrl.js swaps the one shared currentOrder in from that.

    // Any add-to-cart opens the drawer (productCtrl.js, categoryCtrl.js's quick add and its modal).
    $scope.$on('event:addedToCart', function() {
        $scope.openDrawer('cart');
    });

    // A kit still mid-configuration is a real LineItem server-side, but not something the
    // shopper has finished adding - same rule as cartCount below.
    $scope.cartLines = [];
    $scope.$watchCollection(function() {
        return $scope.currentOrder && $scope.currentOrder.Status == 'Unsubmitted' ? $scope.currentOrder.LineItems : null;
    }, function(items) {
        $scope.cartLines = (items || []).filter(function(li) { return !(li.IsKitParent && li.KitIsInvalid); });
    });

    // The design's "Color / Size" line: the values the shopper chose for variant-defining or
    // per-line specs, capped so a long personalization field doesn't take over the row.
    $scope.lineDetail = function(item) {
        var parts = [];
        angular.forEach(item.Specs, function(spec) {
            if (parts.length >= 3 || !spec || !(spec.DefinesVariant || spec.CanSetForLineItem)) return;
            var value = spec.Value != null ? String(spec.Value).trim() : '';
            if (value && value.length <= 40) parts.push(value);
        });
        return parts.join(' / ');
    };

    // Allowed quantities for a restricted price schedule, ascending; null when any quantity goes.
    function allowedQuantities(item) {
        var ps = item.PriceSchedule;
        if (!ps || !ps.RestrictedQuantity || !ps.PriceBreaks) return null;
        var qtys = [];
        angular.forEach(ps.PriceBreaks, function(pb) {
            var q = parseInt(pb.Quantity, 10);
            if (q > 0 && qtys.indexOf(q) < 0) qtys.push(q);
        });
        return qtys.sort(function(a, b) { return a - b; });
    }
    function quantityOf(item) {
        // Quantity inputs elsewhere are type="text", so this can arrive as a string ("1" + 1 = 11).
        return parseInt(item.Quantity, 10) || 0;
    }
    // Kits change quantity on their own page; a restricted schedule with one allowed quantity has
    // nothing to step between.
    $scope.canStepQty = function(item) {
        if (item.IsKitParent) return false;
        var allowed = allowedQuantities(item);
        return !allowed || allowed.length > 1;
    };
    function nextQuantity(item, delta) {
        var qty = quantityOf(item);
        var allowed = allowedQuantities(item);
        if (allowed) {
            var index = allowed.indexOf(qty);
            if (index < 0) index = delta > 0 ? -1 : allowed.length;
            var next = index + delta;
            return next < 0 ? 0 : (next >= allowed.length ? qty : allowed[next]);
        }
        var min = (item.PriceSchedule && item.PriceSchedule.MinQuantity) || 1;
        var result = qty + delta;
        return result < min ? 0 : result;
    }
    $scope.isAtMinQty = function(item) { return nextQuantity(item, -1) === 0; };
    $scope.isAtMaxQty = function(item) {
        var ps = item.PriceSchedule;
        var qty = quantityOf(item);
        if (nextQuantity(item, 1) === qty) return true;
        return !!(ps && ps.MaxQuantity > 0 && qty >= ps.MaxQuantity);
    };

    // Steps save after a short pause, so tapping + five times is one request, not five. Stepping
    // below the minimum removes the line (the design's "quantity to 0 removes it").
    var qtySaveTimer = null;
    var afterCartSave = [];
    $scope.cartSaving = false;
    $scope.stepQty = function(item, delta) {
        var next = nextQuantity(item, delta);
        if (next === 0) return $scope.removeCartLine(item);
        if (next === quantityOf(item)) return;
        item.Quantity = next;
        $scope.cartError = null;
        $timeout.cancel(qtySaveTimer);
        qtySaveTimer = $timeout(saveCart, 600);
    };

    function saveCart() {
        qtySaveTimer = null;
        var order = $scope.currentOrder;
        if (!order) return;
        $scope.cartSaving = true;
        // Same preparation cartCtrl.js's saveChanges() does before Order.save.
        OrderConfig.address(order, $scope.user);
        angular.forEach(order.LineItems, function(li) {
            if (li.DateNeeded) li.DateNeeded = new Date(li.DateNeeded).toDateString();
        });
        Order.save(order, function() {
            $scope.cartSaving = false;
            var callbacks = afterCartSave;
            afterCartSave = [];
            angular.forEach(callbacks, function(fn) { fn(); });
        }, function(ex) {
            $scope.cartSaving = false;
            afterCartSave = [];
            $scope.cartError = (ex && (ex.Detail || ex.Message)) || 'Unable to update your cart.';
            // Put the drawer back on the last order the server accepted - Order.get serves the
            // cached copy of it and broadcasts event:orderUpdate, which Four51Ctrl picks up.
            Order.get(order.ID);
        });
    }

    // No confirm(): the design removes straight from the drawer. Mirrors cartCtrl.js's
    // removeItem() minus the shipping resave, since the shopper isn't in checkout.
    $scope.removeCartLine = function(item) {
        if (!$scope.currentOrder) return;
        $scope.cartError = null;
        if (qtySaveTimer) { $timeout.cancel(qtySaveTimer); qtySaveTimer = null; }
        Order.deletelineitem($scope.currentOrder.ID, item.ID, function(order) {
            if (!order) {
                $scope.user.CurrentOrderID = null;
                User.save($scope.user);
            }
        }, function(ex) {
            $scope.cartError = (ex && (ex.Detail || ex.Message)) || 'Unable to remove that item.';
        });
    };

    // A pending quantity step has to reach the server before checkout reads the order.
    $scope.goToCheckout = function($event) {
        if (!qtySaveTimer && !$scope.cartSaving) return $scope.closeDrawer();
        $event.preventDefault();
        afterCartSave.push(function() {
            $scope.closeDrawer();
            $location.path('checkout');
        });
        if (qtySaveTimer) { $timeout.cancel(qtySaveTimer); saveCart(); }
    };

    // Closes the drawer; from anywhere but the home page it also takes the shopper back to it.
    $scope.continueShopping = function($event) {
        $scope.closeDrawer();
        if ($location.path() !== '/catalog') SectionNav.goTo('shop', $event);
    };

    // Free-shipping bar, from site.json shipping.freeShippingThreshold. Display only.
    function freeShippingThreshold() {
        return ($scope.site && $scope.site.shipping && $scope.site.shipping.freeShippingThreshold) || 0;
    }
    $scope.freeShippingRemaining = function() {
        var subtotal = ($scope.currentOrder && $scope.currentOrder.Subtotal) || 0;
        return Math.max(0, freeShippingThreshold() - subtotal);
    };
    $scope.freeShippingPercent = function() {
        var threshold = freeShippingThreshold();
        if (!threshold) return 0;
        var subtotal = ($scope.currentOrder && $scope.currentOrder.Subtotal) || 0;
        return Math.min(100, Math.round(subtotal / threshold * 100));
    };

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