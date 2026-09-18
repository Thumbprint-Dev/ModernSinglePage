four51.app.factory('Security', ['$451', '$cookieStore', function ($451, $cookieStore) {
    var _cookieName = 'user.' + $451.apiName;
    var logout = false;

    function getCookie(cname) {
        var name = cname + "=";
        var decodedCookie = decodeURIComponent(document.cookie);
        var ca = decodedCookie.split(';');
        for (var i = 0; i < ca.length; i++) {
            var c = ca[i];
            while (c.charAt(0) == ' ') {
                c = c.substring(1);
            }
            if (c.indexOf(name) == 0) {
                return c.substring(name.length, c.length);
            }
        }
        return "";
    }

    return {
        init: function (user, auth) {
            logout = false;
            var string = _cookieName + " = " + auth + ";path=/" + $451.apiName + "/;SameSite=None; Secure";
            document.cookie = string;
        },
        clear: function () {
            $cookieStore.remove(_cookieName);
        },
        auth: function () {
            var token = getCookie(_cookieName);
            if(token.indexOf('Auth') !== -1){
                var parsedToken = JSON.parse(token);
            }
            if (parsedToken && parsedToken.Auth) {
                var tokenString = angular.copy(parsedToken.Auth);
                token = null;
                token = tokenString;
            }
            return token ? token : null;
        },
        isAuthenticated: function () {
            if (!logout) this.currentToken = getCookie(_cookieName);
            return (!!this.currentToken);
        },
        logout: function () {
            logout = true;

            // The live server sets this cookie on path "/<app>" with
            // SameSite=None; Secure; Partitioned (CHIPS). A partitioned cookie sits
            // in its own jar, so an expiry written without those attributes does not
            // clear it - it just creates an unpartitioned cookie of the same name.
            // That is why logging out left the session cookie in place on the
            // deployed site: `logout` above only suppresses isAuthenticated() for
            // the current page, and the next load read the cookie straight back and
            // came up half signed-in, header and all. It looked fine locally because
            // the dev server strips Secure/SameSite from proxied Set-Cookie headers,
            // leaving a plain cookie the old single-variant delete could expire.
            // Path matters too: the server uses no trailing slash, Security.init()
            // does. Expire every combination rather than guess which one is live.
            function delete_cookie(name) {
                var expiry = '; expires=Thu, 01 Jan 1970 00:00:00 UTC';
                var paths = ['/' + $451.apiName, '/' + $451.apiName + '/', '/'];

                angular.forEach(paths, function (path) {
                    document.cookie = name + '=; path=' + path + expiry;
                    // Ignored on http (a Secure cookie cannot be written from an
                    // insecure origin), which is exactly where it is not needed.
                    document.cookie = name + '=; path=' + path + '; SameSite=None; Secure; Partitioned' + expiry;
                });
            }
            delete_cookie(_cookieName);
            delete this.currentToken;
        }
    }
}]);
