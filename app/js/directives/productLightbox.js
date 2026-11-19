// Ported from another Four51/OrderCloud storefront's productLightbox.js (same directive/
// controller/provider names the reference PDT expects: <productlightbox>, LightboxCtrl). Adapted
// for this app in two ways:
// 1. Registered as its own 'OrderCloud-ProductLightbox' module and added as a dependency of the
//    root '451order' module (app.js) - matching how this app already wires in similarly-scoped
//    feature modules (OrderCloud-AnonRouter, OrderCloud-SpecForms), rather than flattening
//    everything onto four51.app directly.
// 2. LightboxImageScope's original source builds LineItem.images only from a
//    Product.StaticSpecGroups.LightboxImages static-spec-group (a per-color image gallery
//    convention from the site it was ported from). That convention isn't set up for this
//    tenant's catalog, so a fallback was added: if no LightboxImages group exists, fall back to
//    a single-image "gallery" built from the product/variant's own LargeImageUrl, so the
//    lightbox still works out of the box without requiring that admin setup first. The
//    multi-image/color-aware behavior is unchanged and will light up automatically if that spec
//    group is ever configured.
// CSS: the original injected raw <style> tags (including an unscoped ".modal-body" override that
// would have leaked into every other modal in this app, e.g. the quick-add modal) directly into
// its directive templates. Styling was moved to custom.css instead (search "mt-lightbox"),
// scoped under .mt-lightbox-modal, matching how every other component in this theme is styled.
angular.module('OrderCloud-ProductLightbox', [
    'ngTouch',
    'ui.bootstrap'
]);

angular.module('OrderCloud-ProductLightbox')
    .directive('productlightbox', productlightbox)
    .controller('LightboxCtrl', LightboxCtrl)
    .provider('Lightbox', Lightbox)
    .service('ImageLoader', ImageLoader)
    .directive('lightboxSrc', lightboxSrc)
;

function productlightbox() {
    var directive = {
        restrict: 'E',
        template: template
    };
    return directive;

    function template() {
        return [
            '<div class="mt-lightbox-thumbnail-panel">',
            '<ul class="mt-lightbox-images">',
            '<li ng-repeat="image in LineItem.images">',
            '<a class="hidden-xs" ng-click="openLightboxModal($index)" ng-class="{active: $index==$parent.index}">',
            '<img ng-src="{{image.url}}" class="mt-lightbox-image-large" />',
            '</a>',
            '<a class="mt-lightbox-no-click visible-xs" ng-class="{active: $index==$parent.index}">',
            '<img ng-src="{{image.url}}" class="mt-lightbox-image-large" />',
            '</a>',
            '</li>',
            '</ul>',
            '</div>',
            '<ul class="mt-lightbox-thumbs" ng-if="LineItem.images.length > 1">',
            '<li ng-repeat="image in LineItem.images">',
            '<a ng-click="selectImage($index)" ng-class="{active: $index==$parent.index}">',
            '<img ng-src="{{image.url}}" class="mt-lightbox-thumb" />',
            '</a>',
            '</li>',
            '</ul>'
        ].join('');
    }
}

LightboxCtrl.$inject = ['$scope', 'Lightbox'];
function LightboxCtrl($scope, Lightbox) {
    // Builds LineItem.images: the product's LightboxImages static spec images when it has any,
    // otherwise its own variant/product image. It used to run only when the line item had specs
    // or the product had static spec groups, and was only re-run by the StaticSpecGroups, Color
    // and Variant watches - so a product with no static specs at all never got an image (one
    // with only text static specs did, by accident of the StaticSpecGroups watch firing). It
    // now runs whenever the product itself is loaded, whatever specs it has.
    function LightboxImageScope($scope) {
        var li = $scope.LineItem;
        if (!li || !li.Product) return;

        var colorSpec = li.Specs && li.Specs.Color;
        var specOption = colorSpec && colorSpec.Value;
        var group = li.Product.StaticSpecGroups && li.Product.StaticSpecGroups.LightboxImages;

        li.images = [];
        if (group) {
            angular.forEach(group.Specs, function (staticSpec) {
                if (!staticSpec.FileURL) return; // a text spec in the group has no image to show
                var name = staticSpec.Name || '';
                li.images.push({
                    Number: li.images.length,
                    url: staticSpec.FileURL,
                    // assumes the spec's name contains the matching Color spec value
                    Selected: !!specOption && name.indexOf(specOption) > -1,
                    Name: name
                });
            });
        }

        // No LightboxImages images for this product - fall back to the single product/variant
        // image instead of an empty gallery.
        if (!li.images.length) {
            var fallbackUrl = (li.Variant && (li.Variant.PreviewUrl || li.Variant.LargeImageUrl)) ||
                li.Product.LargeImageUrl || li.Product.SmallImageUrl;
            if (fallbackUrl) {
                li.images.push({ Number: 0, url: fallbackUrl, Selected: true, Name: '' });
            }
        }
        if ($scope.index >= li.images.length) $scope.index = 0;
        $scope.imageLoaded = true;
    }

    //trigger the click for the first image
    if (!$scope.index) {
        $scope.index = 0;
    }

    $scope.openLightboxModal = function (index) {
        Lightbox.openModal($scope.LineItem.images, index);
    };

    // Called from the thumbnail template instead of the thumbnails' own ng-click writing
    // "$parent.index=$index" directly - the thumbnail <ul> sits behind ng-if (only rendered
    // when there's more than one image), and ng-if creates its own child scope, so that write
    // landed on the ng-if's scope, not this controller's. The main image list (a sibling
    // ng-repeat with no such wrapper) read $parent.index from THIS scope and never saw it
    // change - the thumbnail's own active-border toggled fine (same scope wrote and read it),
    // but clicking a thumbnail never swapped the large image. A function on this scope always
    // closes over this scope's $index, regardless of how deep the caller's own scope nests.
    $scope.selectImage = function (index) {
        $scope.index = index;
    };

    LightboxImageScope($scope);

    // Rebuild once the product loads (and if it's ever swapped), not just when its
    // StaticSpecGroups change - a product with no static specs never changes those.
    $scope.$watch('LineItem.Product', function(n,o){
        if ( n!== o) {
            LightboxImageScope($scope);
        }
    });

    $scope.$watch('LineItem.Specs.Color.Value', function(n,o){
        if ( n!= o) {
            LightboxImageScope($scope);
            angular.forEach ($scope.LineItem.images, function(img) {
                if (img.Selected) {
                    $scope.index = img.Number;
                }
            });
        }
    });

    // Not part of the original source - the single-image fallback above reads
    // LineItem.Variant's own URL, which the upstream watches never needed to track since their
    // real data source (Product.StaticSpecGroups.LightboxImages) doesn't depend on which variant
    // is selected. Re-run when the variant itself changes so the fallback path stays in sync
    // with whatever selection actually drove it (not just a Color spec).
    $scope.$watch('LineItem.Variant', function(n, o) {
        if (n !== o) {
            LightboxImageScope($scope);
        }
    });
}

function Lightbox() {
    this.getImageUrl = function (image) {
        return image.url;
    };
    this.getImageCaption = function (image) {
        return image.caption;
    };
    this.calculateImageDimensionLimits = function (dimensions) {
        if (dimensions.windowWidth >= 768) {
            return {
                'maxWidth': dimensions.windowWidth - 92,
                'maxHeight': dimensions.windowHeight - 126
            };
        } else {
            return {
                'maxWidth': dimensions.windowWidth - 52,
                'maxHeight': dimensions.windowHeight - 86
            };
        }
    };
    this.calculateModalDimensions = function (dimensions) {
        var width = Math.max(400, dimensions.imageDisplayWidth + 32);
        var height = Math.max(200, dimensions.imageDisplayHeight + 66);
        if (width >= dimensions.windowWidth - 20 || dimensions.windowWidth < 768) {
            width = 'auto';
        }
        if (height >= dimensions.windowHeight) {
            height = 'auto';
        }
        return {
            'width': width,
            'height': height
        };
    };
    this.$get = ['$document', '$modal', '$timeout', 'ImageLoader', function ($document, $modal, $timeout, ImageLoader) {
        var Lightbox = {};
        Lightbox.images = [];
        Lightbox.index = -1;
        Lightbox.getImageUrl = this.getImageUrl;
        Lightbox.getImageCaption = this.getImageCaption;
        Lightbox.calculateImageDimensionLimits = this.calculateImageDimensionLimits;
        Lightbox.calculateModalDimensions = this.calculateModalDimensions;
        Lightbox.keyboardNavEnabled = false;
        Lightbox.image = {};
        Lightbox.modalInstance = null;
        Lightbox.openModal = function (newImages, newIndex) {
            Lightbox.images = newImages;
            Lightbox.setImage(newIndex);
            Lightbox.modalInstance = $modal.open({
                'template': imagelightboxtemplate,
                'controller': ['$scope', function ($scope) {
                    $scope.Lightbox = Lightbox;
                    Lightbox.keyboardNavEnabled = true;
                }],
                'windowClass': 'mt-lightbox-modal'
            });
            Lightbox.modalInstance.result['finally'](function () {
                Lightbox.images = [];
                Lightbox.index = 1;
                Lightbox.image = {};
                Lightbox.imageUrl = null;
                Lightbox.imageCaption = null;

                Lightbox.keyboardNavEnabled = false;
            });
            return Lightbox.modalInstance;
        };
        Lightbox.closeModal = function (result) {
            return Lightbox.modalInstance.close(result);
        };
        Lightbox.setImage = function (newIndex) {
            if (!(newIndex in Lightbox.images)) {
                throw 'Invalid image.';
            }
            var success = function () {
                Lightbox.index = newIndex;
                Lightbox.image = Lightbox.images[Lightbox.index];
            };

            var imageUrl = Lightbox.getImageUrl(Lightbox.images[newIndex]);
            ImageLoader.load(imageUrl).then(function () {
                success();
                Lightbox.imageUrl = imageUrl;
                Lightbox.imageCaption = Lightbox.getImageCaption(Lightbox.image);
            }, function () {
                success();
                Lightbox.imageUrl = '//:0';
                Lightbox.imageCaption = 'Failed to load image';
            });
        };
        Lightbox.firstImage = function () {
            Lightbox.setImage(0);
        };
        Lightbox.prevImage = function () {
            Lightbox.setImage((Lightbox.index - 1 + Lightbox.images.length) %
                Lightbox.images.length);
        };
        Lightbox.nextImage = function () {
            Lightbox.setImage((Lightbox.index + 1) % Lightbox.images.length);
        };
        Lightbox.lastImage = function () {
            Lightbox.setImage(Lightbox.images.length - 1);
        };
        Lightbox.setImages = function (newImages) {
            Lightbox.images = newImages;
            Lightbox.setImage(Lightbox.index);
        };
        $document.bind('keydown', function (event) {
            if (!Lightbox.keyboardNavEnabled) {
                return;
            }
            var method = null;
            switch (event.which) {
                case 39: // right arrow key
                    method = 'nextImage';
                    break;
                case 37: // left arrow key
                    method = 'prevImage';
                    break;
            }
            if (method !== null && ['input', 'textarea'].indexOf(
                    event.target.tagName.toLowerCase()) === -1) {
                // the view doesn't update without a manual digest
                $timeout(function () {
                    Lightbox[method]();
                });
                event.preventDefault();
            }
        });
        return Lightbox;
    }];
}

function imagelightboxtemplate () {
    return [
        '<div class="modal-body mt-lightbox-modal-body" ng-swipe-left="Lightbox.nextImage()" ng-swipe-right="Lightbox.prevImage()">',
        '<div class="mt-lightbox-nav" ng-if="Lightbox.images.length > 1">',
        '<div class="btn-group">',
        '<a class="btn btn-xs btn-default" ng-click="Lightbox.prevImage()"><i class="fa fa-chevron-left"></i> Previous</a>',
        '<a ng-href="{{Lightbox.imageUrl}}" target="_blank" class="btn btn-xs btn-default" title="Open in new tab">Open image in new tab</a>',
        '<a class="btn btn-xs btn-default" ng-click="Lightbox.nextImage()">Next <i class="fa fa-chevron-right"></i></a>',
        '</div>',
        '</div>',
        '<button type="button" class="close mt-lightbox-close" ng-click="$dismiss()" aria-label="Close"><span aria-hidden="true">&times;</span></button>',
        '<div class="mt-lightbox-image-container">',
        '<div class="mt-lightbox-image-caption" ng-if="Lightbox.imageCaption"><span>{{Lightbox.imageCaption}}</span></div>',
        '<img lightbox-src="{{Lightbox.imageUrl}}" alt="" class="mt-lightbox-modal-image">',
        '</div>',
        '</div>'
    ].join('');
}

ImageLoader.$inject = ['$q'];
function ImageLoader ($q){
    this.load = function (url) {
        var deferred = $q.defer();
        var image = new Image();
        image.onload = function () {
            if ((typeof this.complete === 'boolean' && this.complete === false) ||
                (typeof this.naturalWidth === 'number' && this.naturalWidth === 0)) {
                deferred.reject();
            }
            deferred.resolve(image);
        };
        image.onerror = function () {
            deferred.reject();
        };
        image.src = url;
        return deferred.promise;
    };
}

lightboxSrc.$inject = ['$window', 'ImageLoader', 'Lightbox'];
function lightboxSrc($window, ImageLoader, Lightbox) {
    var calculateImageDisplayDimensions = function (dimensions) {
        var w = dimensions.width;
        var h = dimensions.height;
        var minW = dimensions.minWidth;
        var minH = dimensions.minHeight;
        var maxW = dimensions.maxWidth;
        var maxH = dimensions.maxHeight;

        var displayW = w;
        var displayH = h;

        if (w < minW && h < minH) {
            if (w / h > maxW / maxH) {
                displayH = minH;
                displayW = Math.round(w * minH / h);
            } else {
                displayW = minW;
                displayH = Math.round(h * minW / w);
            }
        } else if (w < minW) {
            displayW = minW;
            displayH = Math.round(h * minW / w);
        } else if (h < minH) {
            displayH = minH;
            displayW = Math.round(w * minH / h);
        }
        if (w > maxW && h > maxH) {
            if (w / h > maxW / maxH) {
                displayW = maxW;
                displayH = Math.round(h * maxW / w);
            } else {
                displayH = maxH;
                displayW = Math.round(w * maxH / h);
            }
        } else if (w > maxW) {
            displayW = maxW;
            displayH = Math.round(h * maxW / w);
        } else if (h > maxH) {
            displayH = maxH;
            displayW = Math.round(w * maxH / h);
        }

        return {
            'width': displayW || 0,
            'height': displayH || 0 // NaN is possible when dimensions.width is 0
        };
    };
    var imageWidth = 0;
    var imageHeight = 0;

    // Small images are scaled up so their longer side is at least this many pixels (still capped
    // to the window below) - otherwise a 235px product image opened in the lightbox at 235px,
    // smaller than the same image already shows on the product page.
    var MIN_LONG_SIDE = 600;

    return {
        'link': function (scope, element, attrs) {
            var resize = function () {
                var windowWidth = $window.innerWidth;
                var windowHeight = $window.innerHeight;
                var longSide = Math.max(imageWidth, imageHeight);
                var upscale = longSide > 0 && longSide < MIN_LONG_SIDE ? MIN_LONG_SIDE / longSide : 1;
                var imageDimensionLimits = Lightbox.calculateImageDimensionLimits({
                    'windowWidth': windowWidth,
                    'windowHeight': windowHeight,
                    'imageWidth': imageWidth,
                    'imageHeight': imageHeight
                });
                var imageDisplayDimensions = calculateImageDisplayDimensions(
                    angular.extend({
                        'width': Math.round(imageWidth * upscale),
                        'height': Math.round(imageHeight * upscale),
                        'minWidth': 1,
                        'minHeight': 1,
                        'maxWidth': 3000,
                        'maxHeight': 3000,
                    }, imageDimensionLimits)
                );
                var modalDimensions = Lightbox.calculateModalDimensions({
                    'windowWidth': windowWidth,
                    'windowHeight': windowHeight,
                    'imageDisplayWidth': imageDisplayDimensions.width,
                    'imageDisplayHeight': imageDisplayDimensions.height
                });
                element.css({
                    'width': imageDisplayDimensions.width + 'px',
                    'height': imageDisplayDimensions.height + 'px'
                });
                angular.element(
                    document.querySelector('.mt-lightbox-modal .modal-dialog')
                ).css({
                        'width': modalDimensions.width + 'px'
                    });
                // No fixed modal-content height: its contents (image, plus the Previous/Next bar
                // when there are several images) size it, so the padding stays even. The
                // calculated height added a flat 66px for the bar, leaving a strip of empty space
                // under single images.
            };
            scope.$watch(function () {
                return attrs.lightboxSrc;
            }, function (src) {
                element[0].src = '//:0';

                ImageLoader.load(src).then(function (image) {
                    imageWidth = image.naturalWidth;
                    imageHeight = image.naturalHeight;
                    resize();
                    element[0].src = src;
                });
            });
            angular.element($window).on('resize', resize);
        }
    };
}
