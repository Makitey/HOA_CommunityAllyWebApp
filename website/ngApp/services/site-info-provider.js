var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var Ally;
(function (Ally) {
    /**
     * Represents a home owned or rented by a user
     */
    var UsersHome = /** @class */ (function () {
        function UsersHome() {
        }
        return UsersHome;
    }());
    Ally.UsersHome = UsersHome;
    /**
     * The logged-in user's info
     */
    var UserInfo = /** @class */ (function () {
        function UserInfo() {
        }
        return UserInfo;
    }());
    Ally.UserInfo = UserInfo;
    /**
     * Information that is provided to anyone that visits the group's site, even if not logged-in
     */
    var PublicSiteInfo = /** @class */ (function () {
        function PublicSiteInfo() {
        }
        return PublicSiteInfo;
    }());
    Ally.PublicSiteInfo = PublicSiteInfo;
    /**
     * Represents the group descriptive information that can only be accessed by a member of the
     * group
     */
    var PrivateSiteInfo = /** @class */ (function () {
        function PrivateSiteInfo() {
        }
        return PrivateSiteInfo;
    }());
    Ally.PrivateSiteInfo = PrivateSiteInfo;
    /**
     * Represents the descriptive information for a CHTN group (condo, HOA, townhome, neighborhood)
     */
    var ChtnPrivateSiteInfo = /** @class */ (function (_super) {
        __extends(ChtnPrivateSiteInfo, _super);
        function ChtnPrivateSiteInfo() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        return ChtnPrivateSiteInfo;
    }(PrivateSiteInfo));
    Ally.ChtnPrivateSiteInfo = ChtnPrivateSiteInfo;
    /**
     * The current group's site information
     */
    var SiteInfoService = /** @class */ (function () {
        function SiteInfoService() {
            this.publicSiteInfo = new PublicSiteInfo();
            this.privateSiteInfo = new ChtnPrivateSiteInfo();
            this.userInfo = new Ally.UserInfo();
            this.isLoggedIn = false;
        }
        // Retrieve the basic information for the current site
        SiteInfoService.prototype.refreshSiteInfo = function ($rootScope, $http, $q) {
            this._rootScope = $rootScope;
            var deferred = $q.defer();
            $rootScope.isLoadingSite = true;
            var innerThis = this;
            var onSiteInfoReceived = function (siteInfo) {
                $rootScope.isLoadingSite = false;
                innerThis.handleSiteInfo(siteInfo, $rootScope);
                deferred.resolve();
            };
            var onRequestFailed = function () {
                $rootScope.isLoadingSite = false;
                deferred.reject();
            };
            // Retrieve information for the current association
            $http.get("/api/GroupSite").then(function (httpResponse) {
                // If we received data but the user isn't logged-in
                if (httpResponse.data && !httpResponse.data.userInfo) {
                    // Check the cross-domain localStorage for an auth token
                    innerThis.xdLocalStorage.getItem("allyApiAuthToken").then(function (response) {
                        // If we received an auth token then retry accessing the group data
                        if (response && HtmlUtil.isValidString(response.value)) {
                            //console.log( "Received cross domain token:" + response.value );
                            innerThis.setAuthToken(response.value);
                            $http.get("/api/GroupSite").then(function (httpResponse) {
                                onSiteInfoReceived(httpResponse.data);
                            }, onRequestFailed);
                        }
                        else
                            onSiteInfoReceived(httpResponse.data);
                    }, function () {
                        // We failed to get a cross domain token so continue on with what we received
                        onSiteInfoReceived(httpResponse.data);
                    });
                }
                else
                    onSiteInfoReceived(httpResponse.data);
            }, onRequestFailed);
            return deferred.promise;
        };
        ;
        // Returns if a page is for a neutral (public, no login required) page
        SiteInfoService.prototype.testIfIsNeutralPage = function (locationHash) {
            // We only care about Angular paths
            var HashPrefix = "#!/";
            if (!HtmlUtil.startsWith(locationHash, HashPrefix))
                return false;
            // Remove that prefix and add a slash as that's what the menu item stores
            locationHash = "/" + locationHash.substring(HashPrefix.length);
            var menuItem = _.find(AppConfig.menu, function (menuItem) { return menuItem.path === locationHash; });
            return typeof (menuItem) === "object";
        };
        ;
        // Log-in and application start both retrieve information about the current association's site.
        // This function should be used to properly populate the scope with the information.
        SiteInfoService.prototype.handleSiteInfo = function (siteInfo, $rootScope) {
            var subdomain = HtmlUtil.getSubdomain(window.location.host);
            if (!this.authToken && $rootScope.authToken)
                this.setAuthToken($rootScope.authToken);
            // If we're at an unknown subdomain
            if (siteInfo === null || siteInfo === "null") {
                // Allow the user to log-in with no subdomain, create a temp site info object
                var isNeutralSubdomain = subdomain === null || subdomain === "www" || subdomain === "login";
                var isNeutralPage = this.testIfIsNeutralPage(window.location.hash);
                if (isNeutralSubdomain && isNeutralPage) {
                    // Create a default object used to populate a site
                    siteInfo = {};
                    siteInfo.publicSiteInfo =
                        {
                            bgImagePath: "",
                            fullName: AppConfig.appName,
                            //siteLogo: "<span style='font-size: 22pt; color: #FFF;'>Welcome to <a style='color:#a3e0ff; text-decoration: underline;' href='https://" + AppConfig.baseTld + "'>" + AppConfig.appName + "</a></span>"
                            siteLogo: "<span style='font-size: 22pt; color: #FFF;'>Welcome to " + AppConfig.appName + "</span>"
                        };
                }
                else {
                    // Go to generic login                
                    GlobalRedirect("https://login." + AppConfig.baseTld + "/#!/Login");
                    return;
                }
            }
            // Store the site info to the root scope for access by the app module
            $rootScope.publicSiteInfo = siteInfo.publicSiteInfo;
            this.publicSiteInfo = siteInfo.publicSiteInfo;
            if (this.publicSiteInfo.gpsPosition && typeof (google) !== "undefined")
                this.publicSiteInfo.googleGpsPosition = new google.maps.LatLng(this.publicSiteInfo.gpsPosition.lat, this.publicSiteInfo.gpsPosition.lon);
            // Handle private (logged-in only) info
            var privateSiteInfo = siteInfo.privateSiteInfo;
            if (!privateSiteInfo)
                privateSiteInfo = {};
            this.privateSiteInfo = privateSiteInfo;
            // Set the site title
            document.title = this.publicSiteInfo.fullName;
            this.userInfo = siteInfo.userInfo;
            $rootScope.userInfo = siteInfo.userInfo;
            if (HtmlUtil.isLocalStorageAllowed())
                window.localStorage.setItem("siteInfo", angular.toJson(this.publicSiteInfo));
            // If the user is logged-in
            this.isLoggedIn = $rootScope.userInfo !== null && $rootScope.userInfo !== undefined;
            $rootScope.isLoggedIn = this.isLoggedIn;
            if (this.isLoggedIn) {
                if (typeof ($zopim) !== "undefined") {
                    $zopim(function () {
                        $zopim.livechat.setName($rootScope.userInfo.firstName + " " + $rootScope.userInfo.lastName);
                        if ($rootScope.userInfo.emailAddress.indexOf("@") !== -1)
                            $zopim.livechat.setEmail($rootScope.userInfo.emailAddress);
                    });
                }
                $rootScope.isAdmin = $rootScope.userInfo.isAdmin;
                $rootScope.isSiteManager = $rootScope.userInfo.isSiteManager;
                // Tell Segment we know who the user is
                if (typeof (analytics) !== "undefined") {
                    analytics.identify($rootScope.userInfo.emailAddress, {
                        name: $rootScope.userInfo.fullName
                    });
                }
            }
            else {
                $rootScope.userInfo = null;
                // If we're not at the log-in page, the get us there
                var LoginPath = "#!/Login";
                if (window.location.hash != LoginPath && !AppConfig.isPublicRoute(window.location.hash)) {
                    // If we're at a valid subdomain
                    if (this.publicSiteInfo && this.publicSiteInfo.baseUrl) {
                        // Need to set the hash "manually" as $location is not available in the config
                        // block and GlobalRedirect will go to the wrong TLD when working locally
                        window.location.hash = LoginPath;
                        //$location.path( "/Login" );
                        //GlobalRedirect( this.publicSiteInfo.baseUrl + loginPath );
                    }
                    else
                        GlobalRedirect(AppConfig.baseUrl + LoginPath);
                }
            }
            // Update the background
            if (!HtmlUtil.isNullOrWhitespace(this.publicSiteInfo.bgImagePath))
                $(document.documentElement).css("background-image", "url(" + $rootScope.bgImagePath + this.publicSiteInfo.bgImagePath + ")");
            // If we need to redirect
            if (this.publicSiteInfo.baseUrl) {
                if ((subdomain === null || subdomain !== this.publicSiteInfo.shortName)
                    && HtmlUtil.isNullOrWhitespace(OverrideBaseApiPath)) {
                    GlobalRedirect(this.publicSiteInfo.baseUrl + "/#!/Home");
                }
            }
        };
        SiteInfoService.prototype.setAuthToken = function (authToken) {
            if (window.localStorage)
                window.localStorage.setItem("ApiAuthToken", authToken);
            this._rootScope.authToken = authToken;
            this.xdLocalStorage.setItem("allyApiAuthToken", authToken).then(function (response) {
                //console.log( "Set cross domain auth token" );
            });
            this.authToken = authToken;
            //appCacheService.clear( appCacheService.Key_AfterLoginRedirect );
        };
        SiteInfoService.AlwaysDiscussDate = new Date(2018, 7, 1); // Groups created after August 1, 2018 always have discussion enabled
        return SiteInfoService;
    }());
    Ally.SiteInfoService = SiteInfoService;
    var SiteInfoHelper = /** @class */ (function () {
        function SiteInfoHelper() {
        }
        SiteInfoHelper.loginInit = function ($q, $http, $rootScope, $sce, xdLocalStorage) {
            var deferred = $q.defer();
            SiteInfoProvider.siteInfo.xdLocalStorage = xdLocalStorage;
            if (SiteInfoProvider.isSiteInfoLoaded) {
                deferred.resolve(SiteInfoProvider.siteInfo);
            }
            else {
                SiteInfoProvider.siteInfo.refreshSiteInfo($rootScope, $http, $q).then(function () {
                    SiteInfoProvider.isSiteInfoLoaded = true;
                    // Used to control the loading indicator on the site
                    $rootScope.isSiteInfoLoaded = true;
                    $rootScope.siteTitle = {
                        text: $rootScope.publicSiteInfo.siteTitleText
                    };
                    // The logo contains markup so use sce to display HTML content
                    if ($rootScope.publicSiteInfo.siteLogo)
                        $rootScope.siteTitle.logoHtml = $sce.trustAsHtml($rootScope.publicSiteInfo.siteLogo);
                    //$rootScope.siteTitleText = $rootScope.publicSiteInfo.siteTitleText;
                    // Occurs when the user saves changes to the site title
                    $rootScope.onUpdateSiteTitleText = function () {
                        analytics.track("updateSiteTitle");
                        $http.put("/api/Settings", { siteTitle: $rootScope.siteTitle.text });
                    };
                    deferred.resolve(SiteInfoProvider.siteInfo);
                });
            }
            return deferred.promise;
        };
        ;
        return SiteInfoHelper;
    }());
    Ally.SiteInfoHelper = SiteInfoHelper;
    var SiteInfoProvider = /** @class */ (function () {
        function SiteInfoProvider() {
        }
        SiteInfoProvider.prototype.$get = function () {
            if (!SiteInfoProvider.isSiteInfoLoaded)
                alert("Not yet loaded!");
            return SiteInfoProvider.siteInfo;
        };
        SiteInfoProvider.isSiteInfoLoaded = false;
        // Use statics because this class is used to resolve the route before the Angular app is
        // allowed to run
        SiteInfoProvider.siteInfo = new Ally.SiteInfoService();
        return SiteInfoProvider;
    }());
    Ally.SiteInfoProvider = SiteInfoProvider;
})(Ally || (Ally = {}));
angular.module('CondoAlly').provider("SiteInfo", Ally.SiteInfoProvider);
