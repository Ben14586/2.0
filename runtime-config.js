(function () {
  var DEFAULT_API_BASE_URL = "https://two-0-ayb0.onrender.com";
  window.APP_CONFIG = window.APP_CONFIG || {};
  window.APP_CONFIG.apiBaseUrl = window.APP_CONFIG.apiBaseUrl || DEFAULT_API_BASE_URL;
  if (!window.API_BASE_URL && window.APP_CONFIG.apiBaseUrl) {
    window.API_BASE_URL = window.APP_CONFIG.apiBaseUrl;
  }
})();
